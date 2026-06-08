import * as core from '@actions/core';
import * as github from '@actions/github';
import { loadConfig, ConfigError } from './config';
import { runRules } from './rules';
import { evaluateWithGemini, GeminiError } from './ai/gemini';
import { extractPullRequest } from './github/context';
import { deleteStickyComment, upsertStickyComment } from './github/comment';
import { collectReasons, isPassing, renderFailure, renderSuccess } from './render';
import type { AiOutcome } from './types';

type Mode = 'fail' | 'comment' | 'both';

function parseMode(input: string): Mode {
  const v = input.trim().toLowerCase();
  if (v === 'fail' || v === 'comment' || v === 'both') return v;
  core.warning(`Unknown mode "${input}", falling back to "both".`);
  return 'both';
}

export async function run(): Promise<void> {
  try {
    const token = core.getInput('github-token');
    const configPath = core.getInput('config-path') || '.github/pr-title-check.yml';
    const geminiKey = core.getInput('gemini-api-key');
    const mode = parseMode(core.getInput('mode') || 'both');
    const commentOnPass = (core.getInput('comment-on-pass') || 'true').toLowerCase() === 'true';
    const skipBots = (core.getInput('skip-bots') || 'true').toLowerCase() === 'true';

    const pr = extractPullRequest();
    if (!pr) {
      core.warning(
        `pr-title-check expects a pull_request event; got "${github.context.eventName}". Skipping.`,
      );
      setOutputs(true, []);
      return;
    }

    if (pr.draft) {
      core.info('PR is a draft; skipping pr-title-check.');
      setOutputs(true, []);
      return;
    }

    if (skipBots && pr.isBot) {
      core.info(
        `PR #${pr.number} authored by bot "${pr.author}"; skipping pr-title-check. ` +
          'Set skip-bots: false to enforce title rules on bot PRs.',
      );
      setOutputs(true, []);
      return;
    }

    const repoRoot = process.env.GITHUB_WORKSPACE || process.cwd();
    const config = loadConfig(repoRoot, configPath);

    core.info(`Checking PR #${pr.number} title: "${pr.title}"`);
    const ruleFailures = runRules(pr.title, config);

    let aiOutcome: AiOutcome = { status: 'skipped' };
    if (ruleFailures.length === 0 && config.ai.enabled && geminiKey) {
      aiOutcome = await runAi(pr.title, geminiKey, config.ai.model, config.ai.guidance);
    } else if (ruleFailures.length === 0 && config.ai.enabled && !geminiKey) {
      core.info('AI check enabled but no gemini-api-key supplied; skipping AI step.');
    }

    const renderInput = { title: pr.title, ruleFailures, ai: aiOutcome };
    const passed = isPassing(renderInput);
    const reasons = collectReasons(renderInput);
    setOutputs(passed, reasons);

    const wantsComment = mode === 'comment' || mode === 'both';
    if (wantsComment) {
      const octokit = github.getOctokit(token);
      const target = { owner: pr.owner, repo: pr.repo, issueNumber: pr.number };
      if (passed) {
        if (commentOnPass) {
          await upsertStickyComment(octokit, target, renderSuccess(pr.title, aiOutcome));
        } else {
          await deleteStickyComment(octokit, target);
        }
      } else {
        await upsertStickyComment(octokit, target, renderFailure(renderInput));
      }
    }

    if (!passed && (mode === 'fail' || mode === 'both')) {
      core.setFailed(`PR title check failed: ${reasons.join(' | ')}`);
    } else if (passed) {
      core.info('PR title check passed.');
    } else {
      core.info(`PR title check failed (mode=${mode}, not failing job): ${reasons.join(' | ')}`);
    }
  } catch (err) {
    if (err instanceof ConfigError) {
      core.setFailed(err.message);
      return;
    }
    const msg = err instanceof Error ? err.message : String(err);
    core.setFailed(`pr-title-check crashed: ${msg}`);
  }
}

async function runAi(
  title: string,
  apiKey: string,
  model: string,
  guidance: string | undefined,
): Promise<AiOutcome> {
  try {
    const verdict = await evaluateWithGemini({ apiKey, model, title, guidance });
    return { status: 'ok', verdict };
  } catch (err) {
    const message = err instanceof GeminiError ? err.message : (err as Error).message;
    core.warning(`AI semantic check failed open: ${message}`);
    return { status: 'error', errorReason: message };
  }
}

function setOutputs(passed: boolean, reasons: string[]): void {
  core.setOutput('passed', String(passed));
  core.setOutput('reasons', JSON.stringify(reasons));
}

if (require.main === module) {
  void run();
}
