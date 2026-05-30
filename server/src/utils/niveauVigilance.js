/** Aligné sur App\Enum\NiveauVigilance::toJson() côté Symfony. */
const META = {
  NORMAL: {
    label: 'Normal',
    color: 'success',
    icon: '✅',
    critical: false,
    threshold: 0,
  },
  FATIGUE_LEGERE: {
    label: 'Fatigue légère',
    color: 'info',
    icon: '⚠️',
    critical: false,
    threshold: 1,
  },
  FATIGUE_MODEREE: {
    label: 'Fatigue modérée',
    color: 'warning',
    icon: '🚨',
    critical: false,
    threshold: 2,
  },
  FATIGUE_SEVERE: {
    label: 'Fatigue sévère',
    color: 'orange',
    icon: '🔥',
    critical: false,
    threshold: 3,
  },
  SOMNOLENCE_CRITIQUE: {
    label: 'Somnolence critique',
    color: 'danger',
    icon: '🔴',
    critical: true,
    threshold: 4,
  },
};

export function niveauVigilanceToJson(value) {
  const v = value && META[value] ? value : 'NORMAL';
  return {
    value: v,
    ...META[v],
  };
}
