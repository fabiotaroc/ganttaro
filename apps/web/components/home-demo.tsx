import type { ReactNode } from 'react';
import { ClaudeMark, OpenAIMark } from '@/components/brand-marks';

const days = [
  ['M', 23],
  ['T', 24],
  ['W', 25],
  ['T', 26],
  ['F', 27],
  ['M', 30],
  ['T', 1],
  ['W', 2],
  ['T', 3],
  ['F', 4],
] as const;

function Cursor({
  who,
  children,
  says,
}: {
  who: 'you' | 'claude' | 'chatgpt';
  children: ReactNode;
  says?: string;
}) {
  return (
    <div className="home-demo-cursor" data-who={who}>
      <svg className="home-demo-pointer" viewBox="0 0 16 20" aria-hidden="true">
        <path d="M1.5 1.5v14.2l3.9-3.7 2.6 6 2.6-1.1-2.6-5.9h5.4z" />
      </svg>
      <span className="home-demo-tag">{children}</span>
      {says && <span className="home-demo-says">{says}</span>}
    </div>
  );
}

function Revision({
  who,
  what,
  kind,
}: {
  who: 'you' | 'claude' | 'chatgpt';
  what: string;
  kind: string;
}) {
  return (
    <li data-who={who}>
      <span className="home-demo-avatar">
        {who === 'you' ? 'Y' : who === 'claude' ? <ClaudeMark /> : <OpenAIMark />}
      </span>
      <span>
        <strong>{what}</strong>
        <small>{kind}</small>
      </span>
    </li>
  );
}

export function HomeDemo() {
  return (
    <div className="home-demo" aria-hidden="true">
      <div className="home-demo-scene">
        <div className="home-demo-chart">
          <div className="home-demo-days">
            {days.map(([weekday, date], index) => (
              <span key={index} data-week-start={index === 5 || undefined}>
                <small>{weekday}</small>
                {date}
              </span>
            ))}
          </div>
          <div className="home-demo-rows">
            <div />
            <div />
            <div />
            <div />
          </div>
          <div className="home-demo-bar home-demo-design" data-group="blue">
            Design
          </div>
          <div className="home-demo-build">
            <span className="home-demo-link" />
            <span className="home-demo-link home-demo-conflict" />
            <div className="home-demo-bar" data-group="violet">
              Build
            </div>
            <div className="home-demo-bar home-demo-conflict" data-conflict>
              Build
            </div>
          </div>
          <div className="home-demo-bar home-demo-docs" data-group="teal">
            Docs
          </div>
          <span className="home-demo-drawn home-demo-drawn-down" />
          <span className="home-demo-drawn home-demo-drawn-across" />
          <div className="home-demo-milestone">
            <span />
            Launch
          </div>
          <Cursor who="you">You</Cursor>
          <Cursor who="claude" says="Moving Build after Design">
            <ClaudeMark />
            Claude
          </Cursor>
          <Cursor who="chatgpt" says="Adding Launch">
            <OpenAIMark />
            ChatGPT
          </Cursor>
        </div>
        <div className="home-demo-revisions">
          <p>Revisions</p>
          <ol>
            <Revision who="you" what="Lengthened Design" kind="Manual Edit · You" />
            <Revision who="claude" what="Moved Build after Design" kind="Agent Edit · Claude" />
            <Revision who="chatgpt" what="Added Launch" kind="Agent Edit · ChatGPT" />
          </ol>
        </div>
      </div>
    </div>
  );
}
