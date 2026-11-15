/** Scenes for the seasons added after the first two rounds (#66), built from library.tsx. */
import type { ReactNode } from 'react';
import type { Season } from '../season';
import * as L from './library';
import { Clouds, Confetti, Drops, Hearts, Leaves, Petals, Stars } from './layers';
import { Presents, WalkingPiet } from './autumn';
import { Bunting, Edge, Falling, Fig, Figures, Thrown, Traveller, Walker } from './parts';

const ORANGE = ['#ff6d00', '#ff9100', '#ffab40'];
const NL = ['#ae1c28', '#ffffff', '#21468b'];
/** The colours of the EU energy label, A to G. */
const LABEL = ['#00a651', '#4cb847', '#bfd730', '#fff200', '#fdb913', '#f37021', '#ed1c24'];
const RAINBOW = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#24408e', '#732982'];
const MOUSTACHE_STYLES: L.MoustacheStyle[] = ['handlebar', 'walrus', 'chevron', 'pencil'];

export const MORE_SCENES: Partial<Record<Season, () => ReactNode>> = {
  winter: () => (
    <>
      <Falling count={14}>
        <L.Snowflake />
      </Falling>
      <Figures>
        <Fig fx="bob" s={18}>
          <L.Snowman />
        </Fig>
        <Fig s={16}>
          <L.Cup c="#8d6e63" />
        </Fig>
        <Fig fx="twinkle" s={10}>
          <L.Snowflake />
        </Fig>
        <Fig s={14}>
          <L.Skis />
        </Fig>
      </Figures>
    </>
  ),
  spring: () => (
    <>
      <Petals />
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
    </>
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
        <Fig fx="bounce" s={16}>
          <L.BeachBall />
        </Fig>
        <Fig fx="flutter-fly" s={14}>
          <L.Butterfly />
        </Fig>
      </Figures>
      <Edge kind="water" />
      <Traveller s={22}>
        <L.Sailboat />
      </Traveller>
    </>
  ),
  autumn: () => (
    <>
      <Falling count={12} fx="leaf-fall" s={11}>
        <L.Leaf c="#e65100" />
      </Falling>
      <Figures>
        <Fig s={16}>
          <L.Owl />
        </Fig>
        <Fig fx="sway-low" s={12}>
          <L.Leaf c="#fbc02d" />
        </Fig>
        <Fig fx="bob" s={14}>
          <L.Apple />
        </Fig>
        <Fig s={18}>
          <L.Umbrella />
        </Fig>
      </Figures>
    </>
  ),
  dryjanuary: () => (
    <>
      <Drops />
      <Figures>
        <Fig s={11}>
          <L.WaterGlass />
        </Fig>
        <Fig fx="bob" s={16}>
          <L.Smiley />
        </Fig>
        <Fig fx="beat" s={12}>
          <L.Heart c="#4fc3f7" />
        </Fig>
        <Fig s={10} d={-0.6}>
          <L.WaterGlass />
        </Fig>
      </Figures>
    </>
  ),
  movember: () => (
    <>
      <Falling count={7} fx="drift" s={12}>
        <L.Moustache />
      </Falling>
      <Figures>
        <Fig s={24}>
          <L.MoFace />
        </Fig>
        {MOUSTACHE_STYLES.map((style, i) => (
          <Fig key={style} fx="wiggle" d={-i * 0.3} s={20}>
            <L.Moustache style={style} c={['#5d4037', '#3e2723', '#795548', '#212121'][i]} />
          </Fig>
        ))}
      </Figures>
    </>
  ),
  bulbtime: () => (
    <>
      <Edge kind="vine" />
      <Figures>
        {['#e53935', '#ffca28', '#f06292', '#ab47bc', '#ff7043', '#fafafa'].map((c, i) => (
          <Fig key={c} fx="sway-low" d={-i * 0.35} s={9}>
            <L.Tulip c={c} />
          </Fig>
        ))}
      </Figures>
    </>
  ),
  ramadan: () => (
    <>
      <Stars />
      <Figures>
        <Fig s={18}>
          <L.Moon />
        </Fig>
        <Fig fx="sway" hang s={12}>
          <L.Lantern c="#ffb300" />
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
    </>
  ),
  sinttime: () => (
    <>
      <Figures>
        <Fig s={22}>
          <L.Shoe />
        </Fig>
        <Presents />
      </Figures>
      <Walker s={22}>
        <WalkingPiet />
        <Thrown>
          <L.Pepernoot />
        </Thrown>
      </Walker>
    </>
  ),
  football: () => (
    <>
      <Bunting colours={ORANGE} />
      <Figures>
        <Fig fx="bounce" s={18}>
          <L.Football />
        </Fig>
        <Fig fx="float-up" s={10}>
          <L.Balloon c="#ff6d00" />
        </Fig>
        <Fig s={14}>
          <L.Medal />
        </Fig>
        <Fig fx="float-up" d={-0.9} s={10}>
          <L.Balloon c="#ff9100" />
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
        <Fig s={18}>
          <L.Sun />
        </Fig>
        <Fig fx="twinkle" s={10}>
          <L.Snowflake />
        </Fig>
      </Figures>
    </>
  ),
  maybreak: () => (
    <>
      <Clouds />
      <Figures>
        <Fig fx="kite" s={16}>
          <L.Kite />
        </Fig>
        <Fig s={18}>
          <L.Sun />
        </Fig>
        <Fig fx="sway-low" s={9}>
          <L.Tulip c="#f06292" />
        </Fig>
        <Fig fx="flutter-fly" s={14}>
          <L.Butterfly />
        </Fig>
      </Figures>
    </>
  ),
  summerbreak: () => (
    <>
      <Figures>
        <Fig fx="bounce" s={18}>
          <L.BeachBall />
        </Fig>
        <Fig s={18}>
          <L.Sun />
        </Fig>
        <Fig fx="bob" s={11}>
          <L.IceCream />
        </Fig>
        <Fig fx="kite" s={14}>
          <L.Kite />
        </Fig>
      </Figures>
      <Traveller s={44}>
        <L.Caravan />
      </Traveller>
    </>
  ),
  autumnbreak: () => (
    <>
      <Drops />
      <Figures>
        <Fig s={20}>
          <L.Umbrella />
        </Fig>
        <Fig fx="hop" s={18}>
          <L.Boots />
        </Fig>
        <Fig s={18}>
          <L.Cloud />
        </Fig>
        <Fig fx="sway-low" s={12}>
          <L.Leaf c="#e65100" />
        </Fig>
      </Figures>
    </>
  ),
  epiphany: () => (
    <>
      <Stars />
      <Figures>
        <Fig fx="twinkle" s={14}>
          <L.Star c="#ffd54a" />
        </Fig>
        {[0, 1, 2].map((i) => (
          <Fig key={i} fx="bob" d={-i * 0.5} s={16}>
            <svg viewBox="0 0 28 22">
              <path
                d="M2 8l6 5 6-10 6 10 6-5-2 12H4z"
                fill={['#ffc107', '#ffb300', '#ffca28'][i]}
              />
            </svg>
          </Fig>
        ))}
      </Figures>
    </>
  ),
  tulipday: () => (
    <>
      <Edge kind="vine" />
      <Figures>
        {['#e53935', '#ffca28', '#f06292', '#ff7043'].map((c, i) => (
          <Fig key={c} fx="grow-in" d={-i * 0.4} s={10}>
            <L.Tulip c={c} />
          </Fig>
        ))}
      </Figures>
    </>
  ),
  poetryday: () => (
    <>
      <Stars />
      <Figures>
        <Fig s={26}>
          <L.Book c="#7e57c2" />
        </Fig>
        <Fig s={18}>
          <L.Pencil />
        </Fig>
        <Fig fx="beat" s={12}>
          <L.Heart c="#7e57c2" />
        </Fig>
        <Fig fx="twinkle" s={12}>
          <L.Star c="#ffd54a" />
        </Fig>
      </Figures>
    </>
  ),
  birdcount: () => (
    <>
      <Falling count={4} fx="float-sky" s={12}>
        <L.Bird />
      </Falling>
      <Figures>
        <Fig s={18}>
          <L.Bird />
        </Fig>
        <Fig s={18} d={-0.7}>
          <L.Bird c="#3e2723" body="#212121" />
        </Fig>
        <Fig d={-1.4} s={16}>
          <L.Bird c="#e53935" body="#5d4037" />
        </Fig>
        <Fig s={18}>
          <L.Sapling />
        </Fig>
      </Figures>
    </>
  ),
  cleanenergyday: () => (
    <>
      <Clouds />
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
        <Fig s={9}>
          <L.Battery />
        </Fig>
      </Figures>
    </>
  ),
  candlemas: () => (
    <>
      <Stars />
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
        <Fig d={-0.8} s={7}>
          <L.Candle c="#fff3e0" />
        </Fig>
      </Figures>
    </>
  ),
  wetlandsday: () => (
    <>
      <Edge kind="water" />
      <Figures>
        <Fig s={18}>
          <L.Heron />
        </Fig>
        <Fig s={14}>
          <L.Bird c="#90a4ae" body="#37474f" />
        </Fig>
        <Fig fx="jump" s={14} className="festive__fig--float">
          <L.Fish />
        </Fig>
        <Fig fx="crawl" s={12}>
          <L.Ladybug />
        </Fig>
      </Figures>
    </>
  ),
  efficiencyday: () => (
    <>
      <Bunting colours={LABEL} />
      <Figures>
        <Fig s={22}>
          <L.EnergyLabel />
        </Fig>
        <Fig s={18}>
          <L.House c="#43a047" panels />
        </Fig>
        <Fig s={11}>
          <L.Plug />
        </Fig>
        <Fig s={9}>
          <L.Battery />
        </Fig>
      </Figures>
    </>
  ),
  piday: () => (
    <>
      <Falling count={8} s={8}>
        <L.Pi />
      </Falling>
      <Figures>
        <Fig fx="bob" s={18}>
          <L.Pi />
        </Fig>
        <Fig s={20}>
          <L.Pie />
        </Fig>
        <Fig s={28}>
          <L.Chalkboard text="3,14" />
        </Fig>
        <Fig s={14}>
          <L.Pencil />
        </Fig>
      </Figures>
    </>
  ),
  womensday: () => (
    <>
      <Petals c="#ce93d8" />
      <Figures>
        {['#8e24aa', '#ffd54a', '#ab47bc', '#fdd835'].map((c, i) => (
          <Fig key={c} fx="grow-in" d={-i * 0.5} s={14}>
            <L.Flower c={c} heart={i % 2 ? '#8e24aa' : '#ffd54a'} />
          </Fig>
        ))}
      </Figures>
    </>
  ),
  booksweek: () => (
    <>
      <Bunting colours={['#c62828', '#1565c0', '#ffca28']} slow />
      <Figures>
        <Fig s={26}>
          <L.Book c="#c62828" />
        </Fig>
        <Fig s={22} d={-1}>
          <L.Book c="#1565c0" />
        </Fig>
        <Fig s={18}>
          <L.Glasses />
        </Fig>
        <Fig d={-0.5} s={18}>
          <L.Book c="#2e7d32" />
        </Fig>
      </Figures>
    </>
  ),
  cleanupday: () => (
    <>
      <Leaves />
      <Figures>
        <Fig s={20}>
          <L.Litter />
        </Fig>
        <Fig s={14}>
          <L.Trowel />
        </Fig>
        <Fig s={18}>
          <L.Sapling />
        </Fig>
        <Fig fx="beat" s={12}>
          <L.Heart c="#43a047" />
        </Fig>
      </Figures>
    </>
  ),
  treeday: () => (
    <>
      <Leaves />
      <Figures>
        <Fig s={20}>
          <L.Sapling />
        </Fig>
        <Fig s={20} d={-1.5}>
          <L.Sapling />
        </Fig>
        <Fig s={14}>
          <L.Trowel />
        </Fig>
        <Fig fx="bob" s={16}>
          <L.Bird />
        </Fig>
      </Figures>
    </>
  ),
  waterday: () => (
    <>
      <Drops />
      <Figures>
        <Fig s={18}>
          <L.Tap />
        </Fig>
        <Fig s={11}>
          <L.WaterGlass />
        </Fig>
        <Fig fx="beat" s={12}>
          <L.Heart c="#29b6f6" />
        </Fig>
        <Fig s={18}>
          <L.Cloud />
        </Fig>
      </Figures>
    </>
  ),
  clockchange: () => (
    <>
      <Stars />
      <Figures>
        <Fig s={20}>
          <L.Clock />
        </Fig>
        <Fig s={16}>
          <L.Moon />
        </Fig>
        <Fig s={18}>
          <L.Sun />
        </Fig>
        <Fig d={-1} s={14}>
          <L.Clock />
        </Fig>
      </Figures>
    </>
  ),
  aprilfools: () => (
    <>
      <Confetti />
      <Figures>
        <Fig fx="wobble" s={22}>
          <L.JesterCap />
        </Fig>
        <Fig fx="bob" s={16}>
          <L.Smiley wink />
        </Fig>
        <Fig fx="float-up" s={10}>
          <L.Balloon c="#ab47bc" />
        </Fig>
        <Fig fx="pop" d={-0.7} s={14}>
          <L.Smiley />
        </Fig>
      </Figures>
    </>
  ),
  passover: () => (
    <>
      <Stars />
      <Figures>
        <Fig s={22}>
          <L.Matzah />
        </Fig>
        <Fig s={14}>
          <L.Cup c="#8e24aa" />
        </Fig>
        <Fig s={7}>
          <L.Candle />
        </Fig>
        <Fig d={-0.5} s={18}>
          <L.Matzah />
        </Fig>
      </Figures>
    </>
  ),
  healthday: () => (
    <>
      <Hearts />
      <Figures>
        <Fig fx="beat" s={14}>
          <L.Heart c="#ff5252" />
        </Fig>
        <Fig s={44}>
          <L.Heartbeat />
        </Fig>
        <Fig fx="bob" s={14}>
          <L.Apple />
        </Fig>
        <Fig s={10}>
          <L.WaterGlass />
        </Fig>
      </Figures>
    </>
  ),
  artday: () => (
    <>
      <Confetti />
      <Figures>
        <Fig s={24}>
          <L.Palette />
        </Fig>
        <Fig s={18}>
          <L.Brush />
        </Fig>
        <Fig s={22}>
          <L.Frame />
        </Fig>
        <Fig s={14}>
          <L.Pencil />
        </Fig>
      </Figures>
    </>
  ),
  bookday: () => (
    <>
      <Bunting colours={['#2e7d32', '#ef6c00', '#6a1b9a']} slow />
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
        <Fig s={18}>
          <L.Glasses />
        </Fig>
      </Figures>
    </>
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
        <Fig s={14}>
          <L.Medal />
        </Fig>
        <Fig fx="bob" s={14}>
          <L.Smiley />
        </Fig>
        <Fig fx="float-up" s={10}>
          <L.Balloon c="#ff9100" />
        </Fig>
      </Figures>
    </>
  ),
  sunday: () => (
    <>
      <Clouds />
      <Figures>
        <Fig fx="rise" s={22}>
          <L.Sun />
        </Fig>
        <Fig s={18}>
          <L.House panels />
        </Fig>
        <Fig s={11}>
          <L.Plug />
        </Fig>
        <Fig s={9}>
          <L.Battery />
        </Fig>
      </Figures>
    </>
  ),
  europeday: () => (
    <>
      <Bunting colours={['#003399', '#ffcc00']} />
      <Figures>
        <Fig s={22}>
          <L.Stars12 />
        </Fig>
        <Fig fx="twinkle" s={10}>
          <L.Star c="#ffcc00" />
        </Fig>
        <Fig fx="twinkle" d={-0.6} s={8}>
          <L.Star c="#ffcc00" />
        </Fig>
        <Fig fx="twinkle" d={-1.2} s={9}>
          <L.Star c="#ffcc00" />
        </Fig>
      </Figures>
    </>
  ),
  nursesday: () => (
    <>
      <Hearts />
      <Figures>
        <Fig fx="beat" s={14}>
          <L.Heart c="#ff5252" />
        </Fig>
        <Fig s={22}>
          <L.Plaster />
        </Fig>
        <Fig s={40}>
          <L.Heartbeat />
        </Fig>
        <Fig fx="beat" d={-0.5} s={11}>
          <L.Heart c="#ff8a80" />
        </Fig>
      </Figures>
    </>
  ),
  millday: () => (
    <>
      <Clouds />
      <Figures>
        <Fig s={20}>
          <L.Windmill />
        </Fig>
        <Fig s={14}>
          <L.WindTurbine />
        </Fig>
        <Fig s={16}>
          <L.Windmill />
        </Fig>
        <Fig fx="sway-low" s={9}>
          <L.Tulip c="#e53935" />
        </Fig>
      </Figures>
    </>
  ),
  mothersday: () => (
    <>
      <Hearts c="#f48fb1" />
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
    </>
  ),
  ascension: () => (
    <>
      <Falling count={4} fx="float-sky" s={20}>
        <L.Cloud />
      </Falling>
      <Figures>
        <Fig fx="glide" s={24}>
          <L.Dove />
        </Fig>
        <Fig s={18}>
          <L.Sun />
        </Fig>
        <Fig s={26}>
          <L.Bike />
        </Fig>
        <Fig fx="twinkle" s={10}>
          <L.Star c="#ffd54a" />
        </Fig>
      </Figures>
    </>
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
        <Fig fx="beat" d={-0.8} s={14}>
          <L.Heart c="#ffca28" />
        </Fig>
        <Fig fx="beat" d={-1.2} s={14}>
          <L.Heart c="#43a047" />
        </Fig>
      </Figures>
    </>
  ),
  museumday: () => (
    <>
      <Stars />
      <Figures>
        <Fig s={26}>
          <L.Frame />
        </Fig>
        <Fig s={20}>
          <L.Palette />
        </Fig>
        <Fig s={16}>
          <L.Brush />
        </Fig>
        <Fig s={16}>
          <L.Glasses />
        </Fig>
      </Figures>
    </>
  ),
  beeday: () => (
    <>
      <Edge kind="vine" />
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
        <Fig s={13}>
          <L.Flower c="#f06292" />
        </Fig>
      </Figures>
    </>
  ),
  biodiversityday: () => (
    <>
      <Edge kind="vine" />
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
        <Fig fx="bob" s={16}>
          <L.Bird />
        </Fig>
      </Figures>
    </>
  ),
  towelday: () => (
    <>
      <Stars />
      <Figures>
        <Fig fx="flutter" hang s={22}>
          <L.Towel />
        </Fig>
        <Fig s={20}>
          <L.Book c="#43a047" />
        </Fig>
        <Fig fx="bob" s={14}>
          <L.Smiley />
        </Fig>
        <Fig fx="twinkle" s={10}>
          <L.Star c="#ffd54a" />
        </Fig>
      </Figures>
    </>
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
        <Fig d={-0.5} s={7}>
          <L.Candle c="#fff8e1" />
        </Fig>
        <Fig s={18} className="festive__fig--float">
          <L.Lotus />
        </Fig>
      </Figures>
    </>
  ),
  pentecost: () => (
    <>
      <Clouds />
      <Figures>
        <Fig fx="glide" s={26}>
          <L.Dove />
        </Fig>
        <Fig s={7}>
          <L.Candle c="#ffcdd2" />
        </Fig>
        <Fig d={-0.6} s={7}>
          <L.Candle c="#ffcdd2" />
        </Fig>
        <Fig fx="grow-in" s={13}>
          <L.Flower c="#e53935" />
        </Fig>
      </Figures>
    </>
  ),
  childrensday: () => (
    <>
      <Confetti />
      <Figures>
        {['#e53935', '#ffca28', '#1e88e5', '#43a047'].map((c, i) => (
          <Fig key={c} fx="float-up" d={-i * 0.9} s={10}>
            <L.Balloon c={c} />
          </Fig>
        ))}
      </Figures>
    </>
  ),
  bikeday: () => (
    <>
      <Traveller s={34}>
        <L.Bike />
      </Traveller>
      <Figures>
        <Fig s={28}>
          <L.Bike />
        </Fig>
        <Fig fx="spin" s={14}>
          <L.Wheel />
        </Fig>
        <Fig s={18}>
          <L.Sun />
        </Fig>
        <Fig s={14}>
          <L.Medal />
        </Fig>
      </Figures>
    </>
  ),
  environmentday: () => (
    <>
      <Leaves />
      <Figures>
        <Fig s={14}>
          <L.Sapling />
        </Fig>
        <Fig fx="flutter-fly" s={16}>
          <L.Butterfly c="#66bb6a" c2="#26a69a" />
        </Fig>
        <Fig fx="sway-low" s={12}>
          <L.Leaf />
        </Fig>
        <Fig fx="buzz" s={14}>
          <L.Bee />
        </Fig>
      </Figures>
    </>
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
        <Fig fx="jump" d={-1} s={14} className="festive__fig--float">
          <L.Fish c="#ffb74d" />
        </Fig>
        <Fig fx="jump" d={-2} s={12} className="festive__fig--float">
          <L.Fish c="#81c784" />
        </Fig>
        <Fig s={18}>
          <L.Sailboat />
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
        <Fig s={18}>
          <L.Sailboat />
        </Fig>
        <Fig s={16}>
          <L.Flag c="#ae1c28" c2="#ffffff" c3="#21468b" />
        </Fig>
        <Fig fx="jump" s={14}>
          <L.Fish c="#90a4ae" />
        </Fig>
      </Figures>
    </>
  ),
  windday: () => (
    <>
      <Leaves />
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
        <Fig fx="kite" s={14}>
          <L.Kite />
        </Fig>
      </Figures>
    </>
  ),
  picnicday: () => (
    <>
      <Bunting colours={['#e53935', '#fafafa']} />
      <Figures>
        <Fig fx="bob" s={22}>
          <L.Basket />
        </Fig>
        <Fig s={14}>
          <L.Apple />
        </Fig>
        <Fig s={18}>
          <L.Sun />
        </Fig>
        <Fig s={14}>
          <L.Cup c="#ef5350" />
        </Fig>
      </Figures>
    </>
  ),
  refugeeday: () => (
    <>
      <Hearts c="#81d4fa" />
      <Figures>
        <Fig fx="flutter-fly" s={18}>
          <L.Butterfly c="#4fc3f7" c2="#29b6f6" />
        </Fig>
        <Fig fx="flutter-fly" d={-1} s={16}>
          <L.Butterfly c="#ffb300" c2="#ff7043" />
        </Fig>
        <Fig fx="beat" s={12}>
          <L.Heart c="#4fc3f7" />
        </Fig>
        <Fig s={18}>
          <L.House c="#1e88e5" />
        </Fig>
      </Figures>
    </>
  ),
  fathersday: () => (
    <>
      <Bunting colours={['#1565c0', '#1e88e5', '#90caf9']} />
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
        <Fig s={18}>
          <L.Glasses />
        </Fig>
        <Fig fx="beat" s={12}>
          <L.Heart c="#1e88e5" />
        </Fig>
      </Figures>
    </>
  ),
  emojiday: () => (
    <>
      <Falling count={6} s={9}>
        <L.Smiley />
      </Falling>
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
        <Fig fx="pop" d={-2.1} s={16}>
          <L.Smiley />
        </Fig>
      </Figures>
    </>
  ),
  fourdays: () => (
    <>
      <Bunting colours={['#e53935', '#fafafa', '#1e88e5']} />
      <Figures>
        <Fig fx="hop" s={20}>
          <L.Boots />
        </Fig>
        <Fig s={14}>
          <L.Medal />
        </Fig>
        <Fig fx="grow-in" s={13}>
          <L.Flower c="#e53935" />
        </Fig>
        <Fig fx="hop" d={-0.4} s={16}>
          <L.Boots />
        </Fig>
      </Figures>
    </>
  ),
  friendshipday: () => (
    <>
      <Hearts />
      <Figures>
        <Fig s={34}>
          <L.HighFive />
        </Fig>
        <Fig fx="beat" s={12}>
          <L.Heart c="#ff7043" />
        </Fig>
        <Fig fx="bob" s={14}>
          <L.Smiley />
        </Fig>
        <Fig fx="beat" d={-0.6} s={12}>
          <L.Heart c="#ffca28" />
        </Fig>
      </Figures>
    </>
  ),
  perseids: () => (
    <>
      <Falling count={5} fx="shoot" s={36}>
        <L.ShootingStar />
      </Falling>
      <Figures>
        <Fig s={16}>
          <L.Moon />
        </Fig>
        <Fig s={16}>
          <L.Owl />
        </Fig>
        <Fig fx="twinkle" s={8}>
          <L.Star />
        </Fig>
        <Fig fx="twinkle" d={-0.7} s={6}>
          <L.Star />
        </Fig>
      </Figures>
    </>
  ),
  schoolstart: () => (
    <>
      <Bunting colours={['#e53935', '#ffca28', '#1e88e5', '#43a047']} />
      <Figures>
        <Fig fx="bob" s={18}>
          <L.Schoolbag />
        </Fig>
        <Fig s={16}>
          <L.Pencil />
        </Fig>
        <Fig fx="bob" s={14}>
          <L.Apple />
        </Fig>
        <Fig s={28}>
          <L.Chalkboard />
        </Fig>
      </Figures>
    </>
  ),
  evday: () => (
    <>
      <Traveller s={28}>
        <L.Car c="#1e88e5" />
      </Traveller>
      <Figures>
        <Fig s={30}>
          <L.Car />
        </Fig>
        <Fig s={9}>
          <L.Battery />
        </Fig>
        <Fig s={11}>
          <L.Plug />
        </Fig>
        <Fig s={18}>
          <L.Sun />
        </Fig>
      </Figures>
    </>
  ),
  programmersday: () => (
    <>
      <Falling count={7} s={10}>
        <L.Brackets />
      </Falling>
      <Figures>
        <Fig s={30}>
          <L.Brackets />
        </Fig>
        <Fig s={14}>
          <L.Cup c="#6d4c41" />
        </Fig>
        <Fig s={18}>
          <L.Glasses />
        </Fig>
        <Fig fx="bob" s={14}>
          <L.Smiley wink />
        </Fig>
      </Figures>
    </>
  ),
  monumentday: () => (
    <>
      <Bunting colours={NL} />
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
        <Fig s={18}>
          <L.House c="#8d6e63" />
        </Fig>
        <Fig s={20}>
          <L.Frame />
        </Fig>
      </Figures>
    </>
  ),
  roshhashanah: () => (
    <>
      <Stars />
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
        <Fig fx="bob" d={-0.8} s={14}>
          <L.Apple />
        </Fig>
      </Figures>
    </>
  ),
  prinsjesdag: () => (
    <>
      <Figures>
        <Fig s={22}>
          <L.Briefcase />
        </Fig>
        <Fig s={16}>
          <L.Flag c="#ae1c28" c2="#ffffff" c3="#21468b" />
        </Fig>
        <Fig s={18}>
          <L.Book c="#c62828" />
        </Fig>
        <Fig s={14}>
          <L.Medal />
        </Fig>
      </Figures>
      <Traveller s={40}>
        <L.Coach />
      </Traveller>
    </>
  ),
  peaceweek: () => (
    <>
      <Clouds />
      <Figures>
        <Fig fx="glide" s={28}>
          <L.Dove />
        </Fig>
        <Fig fx="glide" d={-1.5} s={18}>
          <L.Dove />
        </Fig>
        <Fig fx="beat" s={12}>
          <L.Heart c="#4fc3f7" />
        </Fig>
        <Fig s={13}>
          <L.Flower c="#fafafa" />
        </Fig>
      </Figures>
    </>
  ),
  midautumn: () => (
    <>
      <Stars />
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
        <Fig fx="sway" d={-0.7} s={12} hang>
          <L.Lantern c="#ffb300" />
        </Fig>
      </Figures>
    </>
  ),
  neighboursday: () => (
    <>
      <Bunting colours={['#ef6c00', '#1e88e5', '#43a047']} />
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
        <Fig s={18}>
          <L.House c="#43a047" />
        </Fig>
      </Figures>
    </>
  ),
  languagesday: () => (
    <>
      <Bunting colours={['#e53935', '#ffca28', '#1e88e5', '#43a047']} />
      <Figures>
        {['hallo', 'hello', 'salam', 'hola'].map((text, i) => (
          <Fig key={text} fx="pop" d={-i * 0.6} s={26}>
            <L.Bubble text={text} c={['#fafafa', '#fff59d', '#b2dfdb', '#f8bbd0'][i]} />
          </Fig>
        ))}
      </Figures>
    </>
  ),
  tourismday: () => (
    <>
      <Figures>
        <Fig s={18}>
          <L.Briefcase />
        </Fig>
        <Fig s={18}>
          <L.Sun />
        </Fig>
        <Fig s={18}>
          <L.Sailboat />
        </Fig>
        <Fig fx="kite" s={14}>
          <L.Kite />
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
    <>
      <Hearts />
      <Figures>
        <Fig fx="beat" s={16}>
          <L.Heart c="#e53935" />
        </Fig>
        <Fig s={44}>
          <L.Heartbeat />
        </Fig>
        <Fig fx="bob" s={14}>
          <L.Apple />
        </Fig>
        <Fig fx="beat" d={-0.6} s={12}>
          <L.Heart c="#ff8a80" />
        </Fig>
      </Figures>
    </>
  ),
  eldersday: () => (
    <>
      <Leaves c="#e65100" />
      <Figures>
        <Fig s={18}>
          <L.Cup c="#fafafa" />
        </Fig>
        <Fig s={18}>
          <L.Knitting />
        </Fig>
        <Fig s={18}>
          <L.Glasses />
        </Fig>
        <Fig fx="beat" s={12}>
          <L.Heart c="#ff7043" />
        </Fig>
      </Figures>
    </>
  ),
  childrensbookweek: () => (
    <>
      <Stars />
      <Figures>
        <Fig s={26}>
          <L.Book c="#ef6c00" />
        </Fig>
        <Fig fx="bob" s={14}>
          <L.Star c="#ffd54a" />
        </Fig>
        <Fig d={-0.8} s={20}>
          <L.Book c="#1e88e5" />
        </Fig>
        <Fig s={16}>
          <L.Owl />
        </Fig>
      </Figures>
    </>
  ),
  animalday: () => (
    <>
      <Hearts />
      <Figures>
        <Fig fx="peek" s={20}>
          <L.Cat />
        </Fig>
        <Fig fx="peek" d={-2} s={20}>
          <L.Dog />
        </Fig>
        <Fig fx="bob" s={16}>
          <L.Bird />
        </Fig>
        <Fig fx="crawl" s={12}>
          <L.Ladybug />
        </Fig>
      </Figures>
    </>
  ),
  teachersday: () => (
    <>
      <Stars />
      <Figures>
        <Fig fx="bob" s={14}>
          <L.Apple />
        </Fig>
        <Fig s={30}>
          <L.Chalkboard text="DANK" />
        </Fig>
        <Fig s={14}>
          <L.Pencil />
        </Fig>
        <Fig s={18}>
          <L.Book c="#c62828" />
        </Fig>
      </Figures>
    </>
  ),
  hydrogenday: () => (
    <>
      <Falling count={5} fx="float-sky" s={10}>
        <L.Molecule />
      </Falling>
      <Figures>
        <Fig s={26}>
          <L.Molecule />
        </Fig>
        <Fig s={26}>
          <L.Car c="#1e88e5" />
        </Fig>
        <Fig s={9}>
          <L.Battery />
        </Fig>
        <Fig fx="bob" s={8}>
          <L.Drop />
        </Fig>
      </Figures>
    </>
  ),
  sustainabilityday: () => (
    <>
      <Leaves />
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
        <Fig s={16}>
          <L.Sapling />
        </Fig>
      </Figures>
    </>
  ),
  foodday: () => (
    <>
      <Bunting colours={['#e53935', '#fafafa']} />
      <Figures>
        <Fig s={26}>
          <L.Plate />
        </Fig>
        <Fig fx="bob" s={14}>
          <L.Apple />
        </Fig>
        <Fig s={18}>
          <L.Pie />
        </Fig>
        <Fig s={18}>
          <L.Basket />
        </Fig>
      </Figures>
    </>
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
        <Fig fx="twinkle" s={8}>
          <L.Star />
        </Fig>
        <Fig fx="twinkle" d={-0.9} s={6}>
          <L.Star />
        </Fig>
      </Figures>
    </>
  ),
  natureday: () => (
    <>
      <Leaves />
      <Figures>
        <Fig s={14}>
          <L.Trowel />
        </Fig>
        <Fig s={20}>
          <L.Sapling />
        </Fig>
        <Fig fx="flutter-fly" s={14}>
          <L.Butterfly />
        </Fig>
        <Fig fx="bob" s={16}>
          <L.Bird />
        </Fig>
      </Figures>
    </>
  ),
  glow: () => (
    <>
      <Stars />
      <Figures>
        <Fig s={40}>
          <L.LightBeams />
        </Fig>
        <Fig fx="twinkle" s={10}>
          <L.Star c="#80deea" />
        </Fig>
        <Fig fx="sway" s={12} hang>
          <L.Lantern c="#7e57c2" />
        </Fig>
        <Fig fx="twinkle" d={-0.8} s={8}>
          <L.Star c="#f48fb1" />
        </Fig>
      </Figures>
    </>
  ),
  carersday: () => (
    <>
      <Hearts />
      <Figures>
        <Fig s={18}>
          <L.Cup c="#fafafa" />
        </Fig>
        <Fig fx="beat" s={14}>
          <L.Heart c="#ff7043" />
        </Fig>
        <Fig s={13}>
          <L.Flower c="#f06292" />
        </Fig>
        <Fig fx="beat" d={-0.6} s={12}>
          <L.Heart c="#ffca28" />
        </Fig>
      </Figures>
    </>
  ),
  elevenelven: () => (
    <>
      <Bunting colours={['#e53935', '#ffd54a', '#43a047']} />
      <Figures>
        <Fig fx="wobble" s={24}>
          <L.JesterCap />
        </Fig>
        <Fig fx="bob" s={14}>
          <L.Smiley wink />
        </Fig>
        <Fig fx="float-up" s={10}>
          <L.Balloon c="#43a047" />
        </Fig>
        <Fig fx="twinkle" s={10}>
          <L.Star c="#ffd54a" />
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
        <Fig s={18}>
          <L.Shoe />
        </Fig>
        <Fig fx="bob" s={10}>
          <L.Pepernoot />
        </Fig>
        <Fig d={-0.5} s={12}>
          <L.Gift box="#43a047" ribbon="#ffffff" />
        </Fig>
      </Figures>
    </>
  ),
  volunteersday: () => (
    <>
      <Hearts />
      <Figures>
        <Fig s={34}>
          <L.HighFive />
        </Fig>
        <Fig fx="beat" s={12}>
          <L.Heart />
        </Fig>
        <Fig fx="beat" d={-0.6} s={12}>
          <L.Heart c="#ff7043" />
        </Fig>
        <Fig fx="bob" s={14}>
          <L.Smiley />
        </Fig>
      </Figures>
    </>
  ),
  purplefriday: () => (
    <>
      <Bunting colours={['#6a1b9a', '#8e24aa', '#ab47bc']} />
      <Figures>
        <Fig fx="beat" s={18}>
          <L.Heart c="#9c27b0" />
        </Fig>
        <Fig fx="beat" d={-0.4} s={14}>
          <L.Heart c="#ab47bc" />
        </Fig>
        <Fig fx="beat" d={-0.8} s={12}>
          <L.Heart c="#ce93d8" />
        </Fig>
        <Fig fx="beat" d={-1.2} s={14}>
          <L.Heart c="#6a1b9a" />
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
        <Fig fx="twinkle" s={10}>
          <L.Star c="#ffd54a" />
        </Fig>
        <Fig s={7}>
          <L.Candle />
        </Fig>
      </Figures>
    </>
  ),
};
