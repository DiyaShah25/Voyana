import { Compass } from 'lucide-react';
interface Props { canBook: boolean; canCollaborate: boolean; flights: boolean; hotels: boolean; transport: boolean; }
export default function Footer(props: Props) {
  return <footer className="workflow-footer"><div><Compass size={24} /><strong>VOYANA</strong><p>trip pe aana</p></div><nav aria-label="Footer navigation"><a href="#destinations">Explore destinations</a>{props.canBook && props.flights && <a href="#/flight">Global Flight Search</a>}{props.canBook && props.hotels && <a href="#/hotel">Hotels & stays</a>}{props.canBook && props.transport && <a href="#/transport">Ground transfers</a>}<a href="#/trips">Trip workspace</a>{props.canCollaborate && <><a href="#/budget">Split expenses</a></>}</nav><p>Project demo. Payments use test money; no real supplier tickets are issued.</p></footer>;
}
