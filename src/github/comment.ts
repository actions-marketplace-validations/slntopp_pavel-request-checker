import * as github from '@actions/github';
import * as core from '@actions/core';

export const STICKY_MARKER = '<!-- pr-title-check -->';

type Octokit = ReturnType<typeof github.getOctokit>;

export interface StickyTarget {
  owner: string;
  repo: string;
  issueNumber: number;
}

export async function upsertStickyComment(
  octokit: Octokit,
  target: StickyTarget,
  body: string,
): Promise<void> {
  const existing = await findStickyComment(octokit, target);
  const finalBody = ensureMarker(body);
  try {
    if (existing) {
      await octokit.rest.issues.updateComment({
        owner: target.owner,
        repo: target.repo,
        comment_id: existing.id,
        body: finalBody,
      });
    } else {
      await octokit.rest.issues.createComment({
        owner: target.owner,
        repo: target.repo,
        issue_number: target.issueNumber,
        body: finalBody,
      });
    }
  } catch (err) {
    handleCommentError(err);
  }
}

export async function deleteStickyComment(octokit: Octokit, target: StickyTarget): Promise<void> {
  const existing = await findStickyComment(octokit, target);
  if (!existing) return;
  try {
    await octokit.rest.issues.deleteComment({
      owner: target.owner,
      repo: target.repo,
      comment_id: existing.id,
    });
  } catch (err) {
    handleCommentError(err);
  }
}

async function findStickyComment(
  octokit: Octokit,
  target: StickyTarget,
): Promise<{ id: number } | null> {
  try {
    const iter = octokit.paginate.iterator(octokit.rest.issues.listComments, {
      owner: target.owner,
      repo: target.repo,
      issue_number: target.issueNumber,
      per_page: 100,
    });
    for await (const { data } of iter) {
      for (const c of data) {
        if (typeof c.body === 'string' && c.body.includes(STICKY_MARKER)) {
          return { id: c.id };
        }
      }
    }
  } catch (err) {
    handleCommentError(err);
  }
  return null;
}

function ensureMarker(body: string): string {
  return body.includes(STICKY_MARKER) ? body : `${STICKY_MARKER}\n${body}`;
}

function handleCommentError(err: unknown): void {
  const e = err as { status?: number; message?: string };
  if (e?.status === 403) {
    core.warning(
      `Skipping PR comment: insufficient permissions (HTTP 403). Add "pull-requests: write" to your workflow.`,
    );
    return;
  }
  core.warning(`Failed to manage PR comment: ${e?.message ?? String(err)}`);
}
