import React from 'react';
import './playground.js';
import { createRoot } from 'react-dom/client';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent, Button } from '@scott/ui';

// Small pen sketches, drawn for the ideas rather than taken from an icon set.
const ideaSketches = {
  possibility: [
    'M5 25 C10 24 13 20 15 15 C17 11 18 7 18 4',
    'M15 16 C11 14 8 11 6 8 M15 16 C19 16 23 13 26 10',
    'M10 5 L12 8 M24 21 L28 23 M4 17 L7 16',
  ],
  ambition: [
    'M11 5 C6 3 5 11 10 12 C15 13 16 5 11 5',
    'M10 13 Q12 18 11 22 M11 21 L5 29 M11 22 Q15 25 17 29',
    'M10 15 Q7 18 3 17 M11 16 Q17 19 23 15',
    'M23 18 L24 12 M20 13 L28 14',
    'M23 12 Q22 7 26 2 L27 5 L25 12',
  ],
  care: [
    'M15 12 C8 9 10 2 14 3 C18 3 18 7 17 11 C21 5 28 7 26 12 C25 15 21 15 18 14 C25 17 23 23 19 21 L16 17 C15 24 8 23 9 18 L12 15 C5 18 2 12 6 10 Q9 9 13 12',
    'M14 12 Q18 10 18 14 Q16 17 13 15 L14 12',
    'M15 20 Q16 25 13 30 M15 26 Q21 22 24 24 Q21 28 15 27',
  ],
};
function IdeaSketch({kind}) {
  return <span className="idea-sketch" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    {ideaSketches[kind].map((d,i) => <path key={i} d={d} />)}
  </svg></span>;
}

function SketchBorder({variant}) {
  const outlines = [
    'M3 2 Q280 0 510 2 T997 1 M998 2 Q996 45 998 98 M997 98 Q740 100 490 98 T2 99 M2 98 Q4 52 2 1',
    'M2 1 Q310 4 620 2 T998 3 M997 2 Q1000 60 997 99 M998 98 Q630 96 350 99 T3 98 M3 99 Q0 40 3 2',
    'M3 3 Q220 0 470 2 T997 2 M998 1 Q996 55 999 98 M997 99 Q700 97 410 99 T2 97 M2 98 Q4 65 1 2',
  ];
  return <svg className="sketch-border" viewBox="0 0 1000 100" preserveAspectRatio="none" aria-hidden="true"><path d={outlines[variant]} vectorEffect="non-scaling-stroke" /></svg>;
}

createRoot(document.getElementById('ideas')).render(
  <Accordion type="multiple" className="site-accordion">
    <AccordionItem value="possibility">
      <SketchBorder variant={0} />
      <AccordionTrigger><IdeaSketch kind="possibility" /><span>The tools we build shape what we can imagine.</span></AccordionTrigger>
      <AccordionContent>
        <p>An effective tool makes something possible that you wouldn’t have thought to attempt without it.</p>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="ambition">
      <SketchBorder variant={1} />
      <AccordionTrigger><IdeaSketch kind="ambition" /><span>How do we make ambition feel ordinary?</span></AccordionTrigger>
      <AccordionContent>
        <p>I wanna make more places where people try the thing they've been quietly thinking about.</p>
      </AccordionContent>
    </AccordionItem>
    <AccordionItem value="care">
      <SketchBorder variant={2} />
      <AccordionTrigger><IdeaSketch kind="care" /><span>What's worth doing even if it never scales?</span></AccordionTrigger>
      <AccordionContent>
        <p>What makes someone cross a continent to see a friend? I'm motivated by seeing people go to <em>what-anyone-sane-would-call-stupid</em> extents to produce <strong>beauty</strong>.</p>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
);

// Decode on activation so basic address scrapers don't find a static mailto link.
function openEmail() {
  const address = [88, 72, 68, 95, 95, 107, 88, 72, 68, 95, 95, 71, 74, 69, 76, 66, 71, 71, 78, 5, 72, 68, 70].map(code => String.fromCharCode(code ^ 43)).join('');
  window.location.href = 'mailto:' + address;
}

const Arrow = ({variant = 0}) => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth=".85" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path className="arrow-rest" d={variant === 0
    ? 'M3.6 12.3 Q6.1 10.3 8 7.9 L11.5 4 M5.1 4.7 L8.4 4.2 L11.9 3.8 Q11.5 6.9 11.8 9.8'
    : 'M4 12 Q6.5 9.2 8.6 7.5 L12 4.2 M5.4 4.2 Q8.7 4.6 12.1 4 M12 4.2 L11.5 7.4 L11.6 10.6'} />

</svg>;
createRoot(document.getElementById('socials')).render(
  <>
    <Button asChild variant="outline" endIcon={<Arrow />}><a href="https://x.com/scottific">X</a></Button>
    <Button type="button" variant="outline" onClick={openEmail} endIcon={<Arrow variant={1} />}>Email</Button>
  </>
);
