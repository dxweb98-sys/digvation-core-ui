import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OperationalEvent, RecentDeployment } from '../types/dashboard';
import { ActivityFeed, feedLabelAgeMinutes } from './activity-feed';

const DEPLOYMENT: RecentDeployment = {
  id: 'd1',
  clientName: 'Nova Salon',
  applicationName: 'Digvation POS',
  serviceName: 'api',
  version: '1.2.3',
  environment: 'Production',
  status: 'FAILED',
  deployedAtLabel: '18 minutes ago',
};

const EVENT: OperationalEvent = {
  id: 'e1',
  type: 'CONTAINER_RESTARTED',
  title: 'Container restarted',
  description: 'nova-pos-api restarted.',
  occurredAtLabel: '6 minutes ago',
  clientName: 'Nova Salon',
  applicationName: 'Digvation POS',
  severity: 'WARNING',
};

function rows() {
  return within(screen.getByRole('list', { name: 'Recent activity' })).getAllByRole('listitem');
}

describe('ActivityFeed', () => {
  it('merges real deployments and events, newest first', () => {
    render(<ActivityFeed deployments={[DEPLOYMENT]} events={[EVENT, { ...EVENT, id: 'e2', title: 'Old event', occurredAtLabel: 'Yesterday' }]} />);

    expect(rows().map((row) => within(row).getByText(/Container restarted|Deploy 1\.2\.3|Old event/).textContent)).toEqual([
      'Container restarted',
      'Deploy 1.2.3 to Production',
      'Old event',
    ]);
  });

  it('states status in words next to its mark', () => {
    render(<ActivityFeed deployments={[DEPLOYMENT]} events={[EVENT]} />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText('Nova Salon / Digvation POS / api')).toBeInTheDocument();
    expect(screen.getByText('nova-pos-api restarted.')).toBeInTheDocument();
  });

  it('does not claim to be a live log, since the data does not update by itself', () => {
    render(<ActivityFeed deployments={[DEPLOYMENT]} events={[EVENT]} />);

    expect(screen.queryByRole('log')).not.toBeInTheDocument();
    expect(screen.queryByText(/live/i)).not.toBeInTheDocument();
  });

  it('slides in only items that arrive after the first render', () => {
    const { rerender } = render(<ActivityFeed deployments={[DEPLOYMENT]} events={[]} />);
    expect(document.querySelector('.activity-feed-item-new')).toBeNull();

    rerender(<ActivityFeed deployments={[DEPLOYMENT]} events={[EVENT]} />);

    const fresh = document.querySelectorAll('.activity-feed-item-new');
    expect(fresh).toHaveLength(1);
    expect(fresh[0]).toHaveTextContent('Container restarted');

    rerender(<ActivityFeed deployments={[DEPLOYMENT]} events={[EVENT]} />);
    expect(document.querySelectorAll('.activity-feed-item-new')).toHaveLength(1);
  });

  it('runs no script of its own', () => {
    const interval = vi.spyOn(window, 'setInterval');
    const timeout = vi.spyOn(window, 'setTimeout');
    const random = vi.spyOn(Math, 'random');
    render(<ActivityFeed deployments={[DEPLOYMENT]} events={[EVENT]} />);

    expect(interval).not.toHaveBeenCalled();
    expect(timeout).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('shows an empty message without entries', () => {
    render(<ActivityFeed deployments={[]} events={[]} />);

    expect(screen.getByText('No recent deployments or operational events.')).toBeInTheDocument();
  });
});

describe('feedLabelAgeMinutes', () => {
  it.each([
    ['moments ago', 0],
    ['6 minutes ago', 6],
    ['1 hour ago', 60],
    ['2 days ago', 2880],
    ['Yesterday', 1440],
  ])('reads %s', (label, minutes) => {
    expect(feedLabelAgeMinutes(label)).toBe(minutes);
  });

  it('sorts an unreadable label last instead of guessing', () => {
    expect(feedLabelAgeMinutes('Sep 4, 2026')).toBe(Number.POSITIVE_INFINITY);
  });
});
