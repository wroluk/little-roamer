import { coastShoreX, COAST_TRAILS } from './northern-coast';
const smooth = (v:number) => { const t=Math.max(0,Math.min(1,v)); return t*t*(3-2*t); };
export const westPoint=(z:number,inland:number,y:number)=>({x:coastShoreX(z)+inland,z,y});
export const ESTUARY_START={x:-450,z:105,y:3};
export const HEADLAND_START=westPoint(-300,35,5);
export const STRAND_START=westPoint(575,40,3);
export const WEST_REGIONS=[
  {id:'river-mouth',name:'River Mouth',bounds:[-650,-325,55,290] as [number,number,number,number],start:ESTUARY_START,
    description:'Follow the low estuary banks onto sandy spits. Reeds, stranded timber and offshore rocks frame the river as it opens into the foggy sea.',
    trails:[
      {name:'Estuary north spit',points:[{x:-345,z:146,y:7.507},{x:-385,z:125,y:6},{x:-420,z:105,y:5},ESTUARY_START,{x:-510,z:110,y:2},{x:-550,z:130,y:1},{x:-530,z:155,y:0.8}]},
      {name:'Estuary south spit',points:[{x:-480,z:280,y:10.744},{x:-495,z:245,y:3},{x:-515,z:220,y:1},{x:-550,z:215,y:0.8}]},
    ]},
  {id:'outer-headlands',name:'Outer Headlands',bounds:[-765,-530,-655,-145] as [number,number,number,number],start:HEADLAND_START,
    description:'Leave Boulder Shoals for a coast of weathered outcrops and hidden coves. Choose the rolling ridge or the low beach, with open sea to the west.',
    trails:[
      {name:'Shoals to headlands',points:[westPoint(-175,30,1.2),westPoint(-225,45,3),HEADLAND_START]},
      {name:'Outer ridge trail',points:[HEADLAND_START,westPoint(-350,70,18),westPoint(-405,80,25),westPoint(-455,55,16),westPoint(-500,32,3),westPoint(-555,38,4),westPoint(-610,75,20)]},
      {name:'Hidden coves beach',points:[HEADLAND_START,westPoint(-350,16,1),westPoint(-405,16,1),westPoint(-455,16,1),westPoint(-500,32,3)]},
    ]},
  {id:'driftwood-strand',name:'Driftwood Strand',bounds:[-765,-535,475,690] as [number,number,number,number],start:STRAND_START,
    description:'Descend from Fjord Coast into sheltered dunes and a long driftwood beach. A rolling inland return looks back across the open water.',
    trails:[
      {name:'Fjord to dune coast',points:[COAST_TRAILS[0].points.at(-1)!,westPoint(535,75,13),STRAND_START]},
      {name:'Driftwood dune circuit',points:[STRAND_START,westPoint(615,25,1.1),westPoint(655,50,8),westPoint(640,95,15),westPoint(590,90,11),STRAND_START]},
    ]},
];

export function westCoastWeight(z:number):number {
  const north=smooth((-z-215)/55)*(1-smooth((-z-610)/65));
  const south=smooth((z-510)/55)*(1-smooth((z-655)/40));
  const mouth=smooth((z-60)/35)*(1-smooth((z-245)/35));
  return Math.max(north,south,mouth);
}
export function applyWestCoast(x:number,z:number,ground:number):number {
  const d=x-coastShoreX(z), weight=westCoastWeight(z)*smooth((d+140)/65)*(1-smooth((d-100)/45))
    * (z>55&&z<290?smooth((-x-395)/40):1);
  if(!weight)return ground;
  let shaped=d< -25 ? -0.45+(d+25)*0.055 : d<10 ? -0.45+0.7*smooth((d+25)/35)
    : d<35 ? 0.25+1.25*smooth((d-10)/25) : 1.5+22*smooth((d-35)/65);
  if(z>510) shaped+=4*Math.exp(-(((d-65)/25)**2))*Math.sin(z*0.045)**2;
  // Keep the outflow open between the two spits, including the low tide channel.
  if(z>155&&z<230&&x< -415) {
    const channel=Math.abs(z-190-3*Math.sin((x+455)*0.03));
    shaped+=(Math.min(shaped,-2)-shaped)*(1-smooth((channel-12)/16));
  }
  return ground+(shaped-ground)*weight;
}
export const WEST_PROPS: {kind:'westSign'|'coastLog'|'layeredRock'|'reed'|'forestPine';x:number;z:number;size:number;angle?:number}[]=[
  {kind:'westSign',x:ESTUARY_START.x+10,z:110,size:1},
  {kind:'westSign',...westPoint(-300,47,0),size:1},
  {kind:'westSign',...westPoint(575,54,0),size:1},
  ...[-335,-385,-440,-535,-590,605,645].map((z,i)=>({kind:'layeredRock' as const,...westPoint(z,z>0?8:42,0),size:0.7+(i%3)*0.15,angle:i*1.3})),
  ...[-365,-470,-565,595,630].map((z,i)=>({kind:'coastLog' as const,...westPoint(z,6,0),size:0.8,angle:0.4+i*0.7})),
  {kind:'coastLog',x:-533,z:139,size:0.75,angle:0.2},
  {kind:'layeredRock',x:-571,z:165,size:0.8},
];
for(let i=0;i<30;i++) {
  const z=94+i*2.4;
  WEST_PROPS.push({kind:'reed',x:-478-12*Math.sin(i*0.7),z,size:0.7+(i%3)*0.2});
}
