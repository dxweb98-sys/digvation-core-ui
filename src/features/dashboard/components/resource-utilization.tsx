import { DProgress } from '@digvation-labs/ui';

type ResourceName = 'CPU' | 'Memory' | 'Disk';

function getUtilizationTone(value: number): 'normal' | 'warning' | 'critical' {
  if (value >= 90) {
    return 'critical';
  }

  if (value >= 75) {
    return 'warning';
  }

  return 'normal';
}

export function ResourceUtilization({
  resourceName,
  value,
}: {
  resourceName: ResourceName;
  value: number;
}) {
  const tone = getUtilizationTone(value);

  return (
    <div className={`resource-utilization resource-utilization-${tone}`}>
      <div className="resource-utilization-heading">
        <span>{resourceName}</span>
        <strong>{value}%</strong>
      </div>
      <DProgress label={`${resourceName} utilization`} value={value} />
      {tone !== 'normal' ? (
        <span className="resource-utilization-note">
          {tone === 'critical' ? 'Critical pressure' : 'Elevated'}
        </span>
      ) : null}
    </div>
  );
}
