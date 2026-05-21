import * as github from '@actions/github';

export interface PullRequestContext {
  number: number;
  title: string;
  draft: boolean;
  owner: string;
  repo: string;
}

export function extractPullRequest(): PullRequestContext | null {
  const ctx = github.context;
  if (ctx.eventName !== 'pull_request' && ctx.eventName !== 'pull_request_target') {
    return null;
  }
  const pr = ctx.payload.pull_request;
  if (!pr) return null;
  return {
    number: pr.number,
    title: pr.title ?? '',
    draft: Boolean(pr.draft),
    owner: ctx.repo.owner,
    repo: ctx.repo.repo,
  };
}
