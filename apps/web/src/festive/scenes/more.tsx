/** Scenes for the seasons added after the first two rounds (#66), built from library.tsx. */
import type { ReactNode } from 'react';
import type { Season } from '../season';
import * as L from './library';
import { Bunting, Edge, Falling, Fig, Figures, Traveller } from './parts';

const ORANGE = ['#ff6d00', '#ff9100', '#ffab40'];
const RAINBOW = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'];

export const MORE_SCENES: Partial<Record<Season, () => ReactNode>> = {
  winter: () => (
    <Falling count={14}>
      <L.Snowflake />
    </Falling>
  ),
  spring: () => (
    <Figures>
      <Fig fx="sway-low" s={9}>
        <L.Tulip c="#e53935" />
      </Fig>
      <Fig fx="sway-low" d={-0.6} s={9}>
        <L.Tulip c="#ffca28" />
      </Fig>
      <Fig fx="sway-low" d={-1.2} s={9}>
        <L.Tulip c="#f06292" />
      </Fig>
      <Fig fx="buzz" s={16}>
        <L.Bee />
      </Fig>
    </Figures>
  ),
  summer: () => (
    <>
      <Figures>
        <Fig s={22}>
          <L.Sun />
        </Fig>
        <Fig fx="bob" s={11}>
          <L.IceCream />
        </Fig>
      </Figures>
      <Edge kind="water" />
      <Traveller s={22}>
        <L.Sailboat />
      </Traveller>
    </>
  ),
  autumn: () => (
    <Falling count={12} fx="leaf-fall" s={11}>
      <L.Leaf c="#e65100" />
    </Falling>
  ),
  dryjanuary: () => (
    <Figures>
      <Fig s={11}>
        <L.WaterGlass />
      </Fig>
      <Fig fx="bob" s={16}>
        <L.Smiley />
      </Fig>
    </Figures>
  ),
  movember: () => (
    <Figures>
      <Fig fx="wiggle" s={28}>
        <L.Moustache />
      </Fig>
    </Figures>
  ),
  bulbtime: () => (
    <Figures>
      {['#e53935', '#ffca28', '#f06292', '#ab47bc', '#ff7043', '#fafafa'].map((c, i) => (
        <Fig key={c} fx="sway-low" d={-i * 0.35} s={9}>
          <L.Tulip c={c} />
        </Fig>
      ))}
    </Figures>
  ),
  ramadan: () => (
    <Figures>
      <Fig s={18}>
        <L.Moon />
      </Fig>
      <Fig fx="twinkle" s={8}>
        <L.Star />
      </Fig>
      <Fig fx="twinkle" d={-0.8} s={6}>
        <L.Star />
      </Fig>
      <Fig fx="twinkle" d={-0.3} s={7}>
        <L.Star />
      </Fig>
    </Figures>
  ),
  sinttime: () => (
    <>
      <Figures>
        <Fig s={22}>
          <L.Shoe />
        </Fig>
      </Figures>
      <Falling count={10} s={8}>
        <L.Pepernoot />
      </Falling>
    </>
  ),
  football: () => (
    <>
      <Bunting colours={ORANGE} />
      <Figures>
        <Fig fx="bounce" s={18}>
          <L.Football />
        </Fig>
      </Figures>
    </>
  ),
  springbreak: () => (
    <>
      <Falling count={8}>
        <L.Snowflake />
      </Falling>
      <Figures>
        <Fig s={14}>
          <L.Skis />
        </Fig>
        <Fig s={16}>
          <L.Snowman />
        </Fig>
      </Figures>
    </>
  ),
  maybreak: () => (
    <Figures>
      <Fig fx="kite" s={16}>
        <L.Kite />
      </Fig>
    </Figures>
  ),
  summerbreak: () => (
    <>
      <Figures>
        <Fig fx="bounce" s={18}>
          <L.BeachBall />
        </Fig>
      </Figures>
      <Traveller s={44}>
        <L.Caravan />
      </Traveller>
    </>
  ),
  autumnbreak: () => (
    <Figures>
      <Fig s={20}>
        <L.Umbrella />
      </Fig>
      <Fig fx="hop" s={18}>
        <L.Boots />
      </Fig>
    </Figures>
  ),
  epiphany: () => (
    <Figures>
      <Fig fx="twinkle" s={14}>
        <L.Star c="#ffd54a" />
      </Fig>
      {[0, 1, 2].map((i) => (
        <Fig key={i} fx="bob" d={-i * 0.5} s={16}>
          <svg viewBox="0 0 28 22">
            <path d="M2 8l6 5 6-10 6 10 6-5-2 12H4z" fill={['#ffc107', '#ffb300', '#ffca28'][i]} />
          </svg>
        </Fig>
      ))}
    </Figures>
  ),
  tulipday: () => (
    <Figures>
      {['#e53935', '#ffca28', '#f06292', '#ff7043'].map((c, i) => (
        <Fig key={c} fx="grow-in" d={-i * 0.4} s={10}>
          <L.Tulip c={c} />
        </Fig>
      ))}
    </Figures>
  ),
  poetryday: () => (
    <Figures>
      <Fig s={26}>
        <L.Book c="#7e57c2" />
      </Fig>
      <Fig s={18}>
        <L.Pencil />
      </Fig>
    </Figures>
  ),
  birdcount: () => (
    <Figures>
      <Fig s={18}>
        <L.Bird />
      </Fig>
      <Fig s={18} d={-0.7}>
        <L.Bird c="#3e2723" body="#212121" />
      </Fig>
    </Figures>
  ),
  cleanenergyday: () => (
    <Figures>
      <Fig s={20}>
        <L.Sun />
      </Fig>
      <Fig s={16}>
        <L.WindTurbine />
      </Fig>
      <Fig s={12}>
        <L.Plug />
      </Fig>
    </Figures>
  ),
  candlemas: () => (
    <Figures>
      <Fig s={7}>
        <L.Candle />
      </Fig>
      <Fig s={7} d={-0.4}>
        <L.Candle c="#fff8e1" />
      </Fig>
      <Fig s={24}>
        <L.Pancake />
      </Fig>
    </Figures>
  ),
  wetlandsday: () => (
    <>
      <Edge kind="water" />
      <Figures>
        <Fig s={18}>
          <L.Heron />
        </Fig>
      </Figures>
    </>
  ),
  efficiencyday: () => (
    <Figures>
      <Fig s={22}>
        <L.EnergyLabel />
      </Fig>
    </Figures>
  ),
  piday: () => (
    <Figures>
      <Fig fx="bob" s={18}>
        <L.Pi />
      </Fig>
      <Fig s={20}>
        <L.Pie />
      </Fig>
    </Figures>
  ),
  womensday: () => (
    <Figures>
      {['#8e24aa', '#ffd54a', '#ab47bc', '#fdd835'].map((c, i) => (
        <Fig key={c} fx="grow-in" d={-i * 0.5} s={14}>
          <L.Flower c={c} heart={i % 2 ? '#8e24aa' : '#ffd54a'} />
        </Fig>
      ))}
    </Figures>
  ),
  booksweek: () => (
    <Figures>
      <Fig s={26}>
        <L.Book c="#c62828" />
      </Fig>
      <Fig s={22} d={-1}>
        <L.Book c="#1565c0" />
      </Fig>
    </Figures>
  ),
  cleanupday: () => (
    <Figures>
      <Fig s={20}>
        <L.Litter />
      </Fig>
    </Figures>
  ),
  treeday: () => (
    <Figures>
      <Fig s={20}>
        <L.Sapling />
      </Fig>
      <Fig s={20} d={-1.5}>
        <L.Sapling />
      </Fig>
    </Figures>
  ),
  waterday: () => (
    <Figures>
      <Fig s={18}>
        <L.Tap />
      </Fig>
    </Figures>
  ),
  clockchange: () => (
    <Figures>
      <Fig s={20}>
        <L.Clock />
      </Fig>
    </Figures>
  ),
  aprilfools: () => (
    <Figures>
      <Fig fx="wobble" s={22}>
        <L.JesterCap />
      </Fig>
      <Fig fx="bob" s={16}>
        <L.Smiley wink />
      </Fig>
    </Figures>
  ),
  passover: () => (
    <Figures>
      <Fig s={22}>
        <L.Matzah />
      </Fig>
    </Figures>
  ),
  healthday: () => (
    <Figures>
      <Fig fx="beat" s={14}>
        <L.Heart c="#ff5252" />
      </Fig>
      <Fig s={44}>
        <L.Heartbeat />
      </Fig>
    </Figures>
  ),
  artday: () => (
    <Figures>
      <Fig s={24}>
        <L.Palette />
      </Fig>
      <Fig s={18}>
        <L.Brush />
      </Fig>
    </Figures>
  ),
  bookday: () => (
    <Figures>
      <Fig s={24}>
        <L.Book c="#2e7d32" />
      </Fig>
      <Fig s={20} d={-1.2}>
        <L.Book c="#ef6c00" />
      </Fig>
      <Fig s={18} d={-0.6}>
        <L.Book c="#6a1b9a" />
      </Fig>
    </Figures>
  ),
  kingsgames: () => (
    <>
      <Bunting colours={ORANGE} />
      <Figures>
        <Fig fx="bounce" s={16}>
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10.5" fill="#ff6d00" />
            <path
              d="M2 12h20M12 1.5q5 10 0 21M12 1.5q-5 10 0 21"
              stroke="#e65100"
              strokeWidth="1"
              fill="none"
            />
          </svg>
        </Fig>
      </Figures>
    </>
  ),
  sunday: () => (
    <Figures>
      <Fig fx="rise" s={22}>
        <L.Sun />
      </Fig>
      <Fig s={18}>
        <L.House panels />
      </Fig>
    </Figures>
  ),
  europeday: () => (
    <Figures>
      <Fig s={22}>
        <L.Stars12 />
      </Fig>
    </Figures>
  ),
  nursesday: () => (
    <Figures>
      <Fig fx="beat" s={14}>
        <L.Heart c="#ff5252" />
      </Fig>
      <Fig s={22}>
        <L.Plaster />
      </Fig>
    </Figures>
  ),
  millday: () => (
    <Figures>
      <Fig s={20}>
        <L.Windmill />
      </Fig>
      <Fig s={14}>
        <L.WindTurbine />
      </Fig>
    </Figures>
  ),
  mothersday: () => (
    <Figures>
      {['#f06292', '#ffca28', '#ef5350'].map((c, i) => (
        <Fig key={c} fx="grow-in" d={-i * 0.5} s={14}>
          <L.Flower c={c} />
        </Fig>
      ))}
      <Fig fx="beat" s={12}>
        <L.Heart />
      </Fig>
    </Figures>
  ),
  ascension: () => (
    <Falling count={4} fx="float-sky" s={20}>
      <L.Cloud />
    </Falling>
  ),
  idahot: () => (
    <>
      <Bunting colours={RAINBOW} />
      <Figures>
        <Fig fx="beat" s={14}>
          <L.Heart c="#e91e63" />
        </Fig>
        <Fig fx="beat" d={-0.4} s={14}>
          <L.Heart c="#7e57c2" />
        </Fig>
      </Figures>
    </>
  ),
  museumday: () => (
    <Figures>
      <Fig s={26}>
        <L.Frame />
      </Fig>
    </Figures>
  ),
  beeday: () => (
    <Figures>
      <Fig s={14}>
        <L.Flower c="#ffca28" heart="#ff8f00" />
      </Fig>
      <Fig fx="buzz" s={16}>
        <L.Bee />
      </Fig>
      <Fig fx="buzz" d={-1.1} s={13}>
        <L.Bee />
      </Fig>
    </Figures>
  ),
  biodiversityday: () => (
    <Figures>
      <Fig s={14}>
        <L.Flower c="#ab47bc" />
      </Fig>
      <Fig fx="flutter-fly" s={18}>
        <L.Butterfly />
      </Fig>
      <Fig fx="crawl" s={14}>
        <L.Ladybug />
      </Fig>
    </Figures>
  ),
  towelday: () => (
    <Figures>
      <Fig fx="flutter" hang s={22}>
        <L.Towel />
      </Fig>
    </Figures>
  ),
  vesak: () => (
    <>
      <Edge kind="water" />
      <Figures>
        <Fig s={26} className="festive__fig--float">
          <L.Lotus />
        </Fig>
        <Fig s={7}>
          <L.Candle />
        </Fig>
      </Figures>
    </>
  ),
  pentecost: () => (
    <Figures>
      <Fig fx="glide" s={26}>
        <L.Dove />
      </Fig>
      <Fig s={7}>
        <L.Candle c="#ffcdd2" />
      </Fig>
    </Figures>
  ),
  childrensday: () => (
    <Figures>
      {['#e53935', '#ffca28', '#1e88e5', '#43a047'].map((c, i) => (
        <Fig key={c} fx="float-up" d={-i * 0.9} s={10}>
          <L.Balloon c={c} />
        </Fig>
      ))}
    </Figures>
  ),
  bikeday: () => (
    <Traveller s={34}>
      <L.Bike />
    </Traveller>
  ),
  environmentday: () => (
    <Figures>
      <Fig s={14}>
        <L.Sapling />
      </Fig>
      <Fig fx="flutter-fly" s={16}>
        <L.Butterfly c="#66bb6a" c2="#26a69a" />
      </Fig>
    </Figures>
  ),
  oceansday: () => (
    <>
      <Edge kind="water" />
      <Figures>
        <Fig fx="jump" s={18} className="festive__fig--float">
          <svg viewBox="0 0 24 14">
            <ellipse cx="11" cy="7" rx="8" ry="4.5" fill="#4fc3f7" />
            <path d="M3 7L0 2v10z" fill="#4fc3f7" />
            <circle cx="16" cy="6" r=".9" fill="#01579b" />
          </svg>
        </Fig>
      </Figures>
    </>
  ),
  flagday: () => (
    <>
      <Bunting colours={['#ae1c28', '#ffffff', '#21468b', '#ff9100']} />
      <Figures>
        <Fig fx="wiggle" s={24}>
          <svg viewBox="0 0 30 12">
            <path d="M2 6q10-7 22-1l5-4v10l-5-4Q14 13 2 6z" fill="#90a4ae" />
            <circle cx="6" cy="5" r=".9" fill="#263238" />
          </svg>
        </Fig>
      </Figures>
    </>
  ),
  windday: () => (
    <Figures>
      <Fig s={14}>
        <L.WindTurbine />
      </Fig>
      <Fig s={18}>
        <L.WindTurbine />
      </Fig>
      <Fig s={14}>
        <L.WindTurbine />
      </Fig>
    </Figures>
  ),
  picnicday: () => (
    <Figures>
      <Fig fx="bob" s={22}>
        <L.Basket />
      </Fig>
      <Fig s={14}>
        <L.Apple />
      </Fig>
    </Figures>
  ),
  refugeeday: () => (
    <Figures>
      <Fig fx="flutter-fly" s={18}>
        <L.Butterfly c="#4fc3f7" c2="#29b6f6" />
      </Fig>
    </Figures>
  ),
  fathersday: () => (
    <Figures>
      <Fig s={18}>
        <L.Cup c="#8d6e63" />
      </Fig>
      <Fig fx="sway" hang s={10}>
        <svg viewBox="0 0 12 30">
          <path d="M3 0h6l-1.5 4h-3z" fill="#1565c0" />
          <path d="M4.5 4h3L10 24l-4 5-4-5z" fill="#1e88e5" />
          <path d="M3.5 10l5-2M3 16l6-2M2.5 22l7-2" stroke="#ffca28" strokeWidth="1" />
        </svg>
      </Fig>
    </Figures>
  ),
  emojiday: () => (
    <Figures>
      <Fig fx="pop" s={16}>
        <L.Smiley />
      </Fig>
      <Fig fx="pop" d={-0.7} s={16}>
        <L.Smiley wink />
      </Fig>
      <Fig fx="pop" d={-1.4} s={16}>
        <L.Heart c="#ff5252" />
      </Fig>
    </Figures>
  ),
  fourdays: () => (
    <Figures>
      <Fig fx="hop" s={20}>
        <L.Boots />
      </Fig>
      <Fig s={14}>
        <L.Medal />
      </Fig>
    </Figures>
  ),
  friendshipday: () => (
    <Figures>
      <Fig s={34}>
        <L.HighFive />
      </Fig>
    </Figures>
  ),
  perseids: () => (
    <Falling count={5} fx="shoot" s={36}>
      <L.ShootingStar />
    </Falling>
  ),
  schoolstart: () => (
    <Figures>
      <Fig fx="bob" s={18}>
        <L.Schoolbag />
      </Fig>
      <Fig s={16}>
        <L.Pencil />
      </Fig>
    </Figures>
  ),
  evday: () => (
    <Figures>
      <Fig s={30}>
        <L.Car />
      </Fig>
      <Fig s={9}>
        <L.Battery />
      </Fig>
    </Figures>
  ),
  programmersday: () => (
    <Figures>
      <Fig s={30}>
        <L.Brackets />
      </Fig>
    </Figures>
  ),
  monumentday: () => (
    <Figures>
      <Fig s={20}>
        <L.Windmill />
      </Fig>
      <Fig s={18}>
        <svg viewBox="0 0 20 30">
          <path d="M10 1l4 9H6z" fill="#8d6e63" />
          <rect x="6" y="10" width="8" height="19" fill="#bcaaa4" />
          <rect className="fx-door" x="8" y="22" width="4" height="7" fill="#5d4037" />
          <circle cx="10" cy="15" r="2" fill="#fafafa" />
        </svg>
      </Fig>
    </Figures>
  ),
  roshhashanah: () => (
    <Figures>
      <Fig fx="bob" s={16}>
        <L.Apple />
      </Fig>
      <Fig s={16}>
        <L.HoneyPot />
      </Fig>
      <Fig s={24}>
        <L.Shofar />
      </Fig>
    </Figures>
  ),
  prinsjesdag: () => (
    <>
      <Figures>
        <Fig s={22}>
          <L.Briefcase />
        </Fig>
      </Figures>
      <Traveller s={40}>
        <L.Coach />
      </Traveller>
    </>
  ),
  peaceweek: () => (
    <Figures>
      <Fig fx="glide" s={28}>
        <L.Dove />
      </Fig>
    </Figures>
  ),
  midautumn: () => (
    <Figures>
      <Fig s={20}>
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#fff8e1" />
          <circle cx="9" cy="9" r="1.6" fill="#ffecb3" />
          <circle cx="15" cy="14" r="2" fill="#ffecb3" />
        </svg>
      </Fig>
      <Fig fx="sway" hang s={14}>
        <L.Lantern c="#e53935" />
      </Fig>
      <Fig s={18}>
        <L.Mooncake />
      </Fig>
    </Figures>
  ),
  neighboursday: () => (
    <Figures>
      <Fig s={18}>
        <L.House c="#ef6c00" />
      </Fig>
      <Fig fx="pingpong" s={10}>
        <L.Heart />
      </Fig>
      <Fig s={18}>
        <L.House c="#1e88e5" />
      </Fig>
    </Figures>
  ),
  languagesday: () => (
    <Figures>
      {['hallo', 'hello', 'salam', 'hola'].map((text, i) => (
        <Fig key={text} fx="pop" d={-i * 0.6} s={26}>
          <L.Bubble text={text} c={['#fafafa', '#fff59d', '#b2dfdb', '#f8bbd0'][i]} />
        </Fig>
      ))}
    </Figures>
  ),
  tourismday: () => (
    <>
      <Figures>
        <Fig s={18}>
          <L.Briefcase />
        </Fig>
      </Figures>
      <Traveller s={30}>
        <svg viewBox="0 0 34 16">
          <path d="M2 8h26q5 0 5 2t-5 2H8z" fill="#fafafa" />
          <path d="M14 8l-6-7h4l9 7zM14 12l-4 4h3l6-4zM3 8L1 3h3l3 5z" fill="#90caf9" />
        </svg>
      </Traveller>
    </>
  ),
  heartday: () => (
    <Figures>
      <Fig fx="beat" s={16}>
        <L.Heart c="#e53935" />
      </Fig>
      <Fig s={44}>
        <L.Heartbeat />
      </Fig>
    </Figures>
  ),
  eldersday: () => (
    <Figures>
      <Fig s={18}>
        <L.Cup c="#fafafa" />
      </Fig>
      <Fig s={18}>
        <L.Knitting />
      </Fig>
    </Figures>
  ),
  childrensbookweek: () => (
    <Figures>
      <Fig s={26}>
        <L.Book c="#ef6c00" />
      </Fig>
      <Fig fx="bob" s={14}>
        <L.Star c="#ffd54a" />
      </Fig>
    </Figures>
  ),
  animalday: () => (
    <Figures>
      <Fig fx="peek" s={20}>
        <L.Cat />
      </Fig>
      <Fig fx="peek" d={-2} s={20}>
        <L.Dog />
      </Fig>
    </Figures>
  ),
  teachersday: () => (
    <Figures>
      <Fig fx="bob" s={14}>
        <L.Apple />
      </Fig>
      <Fig s={30}>
        <L.Chalkboard text="DANK" />
      </Fig>
    </Figures>
  ),
  hydrogenday: () => (
    <Figures>
      <Fig s={26}>
        <L.Molecule />
      </Fig>
    </Figures>
  ),
  sustainabilityday: () => (
    <Figures>
      <Fig s={20}>
        <L.House c="#43a047" panels />
      </Fig>
      <Fig s={18}>
        <L.Sun />
      </Fig>
      <Fig s={11}>
        <L.Plug />
      </Fig>
    </Figures>
  ),
  foodday: () => (
    <Figures>
      <Fig s={26}>
        <L.Plate />
      </Fig>
    </Figures>
  ),
  nightofthenight: () => (
    <>
      <Falling count={10} fx="twinkle-static" s={6}>
        <L.Star />
      </Falling>
      <Figures>
        <Fig s={16}>
          <L.Owl />
        </Fig>
        <Fig s={16}>
          <L.Moon />
        </Fig>
      </Figures>
    </>
  ),
  natureday: () => (
    <Figures>
      <Fig s={14}>
        <L.Trowel />
      </Fig>
      <Fig s={20}>
        <L.Sapling />
      </Fig>
    </Figures>
  ),
  glow: () => (
    <Figures>
      <Fig s={40}>
        <L.LightBeams />
      </Fig>
    </Figures>
  ),
  carersday: () => (
    <Figures>
      <Fig s={18}>
        <L.Cup c="#fafafa" />
      </Fig>
      <Fig fx="beat" s={14}>
        <L.Heart c="#ff7043" />
      </Fig>
    </Figures>
  ),
  elevenelven: () => (
    <>
      <Bunting colours={['#e53935', '#ffd54a', '#43a047']} />
      <Figures>
        <Fig fx="wobble" s={24}>
          <L.JesterCap />
        </Fig>
      </Figures>
    </>
  ),
  arrival: () => (
    <>
      <Edge kind="water" />
      <Traveller s={42}>
        <L.Steamboat />
      </Traveller>
      <Figures>
        <Fig s={12}>
          <L.Gift />
        </Fig>
      </Figures>
    </>
  ),
  volunteersday: () => (
    <Figures>
      <Fig s={34}>
        <L.HighFive />
      </Fig>
      <Fig fx="beat" s={12}>
        <L.Heart />
      </Fig>
    </Figures>
  ),
  purplefriday: () => (
    <>
      <Bunting colours={['#6a1b9a', '#8e24aa', '#ab47bc']} />
      <Figures>
        <Fig fx="beat" s={18}>
          <L.Heart c="#9c27b0" />
        </Fig>
      </Figures>
    </>
  ),
  shortestday: () => (
    <>
      <Falling count={8} fx="twinkle-static" s={6}>
        <L.Star />
      </Falling>
      <Figures>
        <Fig s={18}>
          <L.Moon />
        </Fig>
        <Fig fx="peek-sun" s={20}>
          <L.Sun />
        </Fig>
      </Figures>
    </>
  ),
};
