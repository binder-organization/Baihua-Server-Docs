import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  icon: ReactNode;
  description: ReactNode;
};

const features: FeatureItem[] = [
  {
    title: translate({id: 'homepage.feature.coreFirst.title', message: 'Core-First'}),
    icon: (
      <svg viewBox="0 0 80 80" width="80" height="80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Solid core/trunk shape */}
        <rect x="30" y="10" width="20" height="60" rx="4" fill="currentColor" opacity="0.9" />
        {/* Base platform */}
        <rect x="15" y="65" width="50" height="8" rx="2" fill="currentColor" opacity="0.6" />
        {/* Inner core highlight */}
        <rect x="36" y="20" width="8" height="40" rx="2" fill="currentColor" opacity="0.3" />
      </svg>
    ),
    description: (
      <>
        <Translate id="homepage.feature.coreFirst.desc">
          We prioritize building a stable, powerful, and scalable backend service,
          ensuring all business logic and data management meet production-grade standards.
        </Translate>
      </>
    ),
  },
  {
    title: translate({id: 'homepage.feature.apiDriven.title', message: 'API-Driven'}),
    icon: (
      <svg viewBox="0 0 80 80" width="80" height="80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Left endpoint */}
        <rect x="8" y="25" width="20" height="30" rx="4" fill="currentColor" opacity="0.7" />
        <circle cx="18" cy="40" r="4" fill="currentColor" opacity="0.3" />
        {/* Right endpoint */}
        <rect x="52" y="25" width="20" height="30" rx="4" fill="currentColor" opacity="0.7" />
        <circle cx="62" cy="40" r="4" fill="currentColor" opacity="0.3" />
        {/* Connection line */}
        <line x1="28" y1="40" x2="52" y2="40" stroke="currentColor" strokeWidth="2" opacity="0.6" />
        {/* Arrows */}
        <polygon points="48,36 52,40 48,44" fill="currentColor" opacity="0.8" />
      </svg>
    ),
    description: (
      <>
        <Translate id="homepage.feature.apiDriven.desc">
          All functionalities are exposed through clear APIs.
          This provides ultimate flexibility for integration and any form of future client development.
        </Translate>
      </>
    ),
  },
  {
    title: translate({id: 'homepage.feature.transparent.title', message: 'Transparent & Explainable'}),
    icon: (
      <svg viewBox="0 0 80 80" width="80" height="80" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Eye shape */}
        <ellipse cx="40" cy="40" rx="30" ry="18" stroke="currentColor" strokeWidth="2.5" opacity="0.8" fill="none" />
        {/* Pupil */}
        <circle cx="40" cy="40" r="8" fill="currentColor" opacity="0.7" />
        {/* Iris highlight */}
        <circle cx="37" cy="37" r="2.5" fill="currentColor" opacity="0.3" />
        {/* Magnifying glass handle */}
        <line x1="60" y1="55" x2="68" y2="63" stroke="currentColor" strokeWidth="3" strokeLinecap="round" opacity="0.7" />
      </svg>
    ),
    description: (
      <>
        <Translate id="homepage.feature.transparent.desc">
          Any automated operation must be fully explainable and traceable.
          We ensure that "what happened" and "why it happened" are completely transparent to developers.
        </Translate>
      </>
    ),
  },
];

function Feature({title, icon, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.featureCard}>
        <div className="text--center">
          <div className={styles.featureIcon}>
            {icon}
          </div>
        </div>
        <div className="text--center padding-horiz--md">
          <Heading as="h3">{title}</Heading>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <Heading as="h2" className={styles.sectionTitle}>
          <Translate id="homepage.designPhilosophy">Design Philosophy</Translate>
        </Heading>
        <div className="row">
          {features.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
