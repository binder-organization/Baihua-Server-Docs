import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import Heading from '@theme/Heading';
import Translate, {translate} from '@docusaurus/Translate';

import styles from './index.module.css';

// `versions.json` is written by `docusaurus docs:version` and lists versions
// newest-first, so the homepage always points at the latest docs without
// needing a manual edit on every release.
import docVersions from '@site/versions.json';

const LATEST_DOCS_VERSION = docVersions[0];

function HomepageHeader() {
  return (
    <header className="hero hero--baihua">
      <div className="container">
        <Heading as="h1" className="hero__title">
          <Translate id="homepage.title">Baihua</Translate>
        </Heading>
        <p className="hero__subtitle">
          <Translate id="homepage.tagline">The Communication Tool for Developers</Translate>
        </p>
        <div className="hero__actions">
          <Link
            className="button button--secondary button--lg"
            to={`/docs/${LATEST_DOCS_VERSION}/quick-start`}>
            <Translate id="homepage.quickStart">Quick Start</Translate>
          </Link>
          <Link
            className="button button--outline button--lg"
            to={`/docs/${LATEST_DOCS_VERSION}/overview`}
            style={{
              borderColor: 'rgba(255,255,255,0.5)',
              color: '#ffffff',
            }}>
            <Translate id="homepage.learnMore">Learn More</Translate>
          </Link>
        </div>
      </div>
    </header>
  );
}

function QuickStartPreview(): ReactNode {
  return (
    <section className={styles.quickStartPreview}>
      <div className="container">
        <Heading as="h2">
          <Translate id="homepage.quickStartTitle">Get Started in Minutes</Translate>
        </Heading>
        <p>
          <Translate id="homepage.quickStartDesc">
            Baihua is a team communication tool customized for developers, built with Rust.
            Get your server running with just a few commands.
          </Translate>
        </p>
        <div className={styles.codeBlock}>
          <pre>
            <code>{`git clone https://github.com/binder-organization/Baihua-Server.git
cd Baihua-Server
cp .env.example .env          # defaults work as-is for local dev
docker compose up -d database # PostgreSQL on :2423
cargo run                     # server on http://localhost:2424`}</code>
          </pre>
        </div>
        <Link
          className="button button--primary button--lg"
          to={`/docs/${LATEST_DOCS_VERSION}/quick-start`}>
          <Translate id="homepage.viewGuide">View Full Quick Start Guide →</Translate>
        </Link>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title={translate({id: 'homepage.title'})}
      description={translate({id: 'homepage.metaDescription', message: "Baihua - The Communication Tool for Developers. A Rust-based team communication tool integrating Git, GitHub, and CI/CD workflows."})}>
      <HomepageHeader />
      <main>
        <HomepageFeatures />
        <QuickStartPreview />
      </main>
    </Layout>
  );
}
