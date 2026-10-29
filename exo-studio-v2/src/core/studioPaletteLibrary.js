// Yeezy-inspired reference — approximate editorial UI swatches, not official sampled brand colors.
// Source: GOAT, "Beginner's Guide to Yeezy Shoes" (editorial colorway names:
// Bone, Onyx, Sand Taupe, Oil, Resin, Graphite). Extended stone, ash, olive,
// cloud and mineral ramps are original UI interpretations, not product samples.
// No Yeezy affiliation, license or endorsement is implied.
// Each ramp progresses from pale 0 through dark 900.
export const STUDIO_PALETTE_SOURCE_NOTE = 'Yeezy-inspired reference — approximate editorial UI swatches, not official sampled brand colors'
const makeRamp = (values) => Object.freeze(Object.fromEntries(
  ['0','100','200','300','400','500','600','700','800','900']
    .map((level, index) => [level, values[index]])
))

export const STUDIO_PALETTE_LIBRARY = Object.freeze({
  bone: makeRamp(['#fcfbf7','#f4f0e7','#e7e0d4','#d6cbb9','#bfb09a','#a3927e','#847463','#67584d','#493f37','#29241f']),
  sandTaupe: makeRamp(['#fcf8f2','#f1e9df','#e4d7c7','#cebaa6','#b59c83','#98816d','#7a6757','#605144','#463c34','#2c2622']),
  stoneSage: makeRamp(['#f7f8f2','#e9eddf','#d9e0cd','#bdc8b1','#a0af98','#82927c','#657660','#4e5b4b','#39443a','#232c26']),
  resin: makeRamp(['#f6f5ed','#e9e7d6','#d5d0b6','#b6ac83','#91865f','#716b4b','#56523e','#404032','#302f29','#20221d']),
  onyx: makeRamp(['#f2f2ef','#dcddd7','#bfc1b9','#9b9e95','#7a7e77','#616660','#494d49','#373b37','#282b29','#191c1c']),
  oil: makeRamp(['#f3f5ee','#e0e7d8','#c3d0ba','#9eae96','#7b9077','#60745e','#475b49','#354738','#28372d','#1b2922']),
  ash: makeRamp(['#fbfaf8','#f0efeb','#e1dfda','#cbc8c1','#b2aea6','#928f88','#74736d','#585954','#40423f','#272a28']),
  granite: makeRamp(['#f7f8f8','#e8e9e8','#d5d8d7','#b9bebc','#9ba3a0','#7d8784','#616b69','#495351','#333d3b','#202927']),
  chalk: makeRamp(['#ffffff','#f7f7f1','#e9ebe1','#d7dacb','#bfc6b5','#a1ad9c','#7e917f','#5c705f','#415546','#273b2f']),
  cloud: makeRamp(['#ffffff','#f5f8fa','#e8eff2','#d3dfe5','#b8cbd4','#98b3c1','#7895a6','#5d7888','#405b69','#273b48']),
  cream: makeRamp(['#fffef7','#fbf5e7','#f2e8d1','#e3d5b5','#cdbb95','#b39e7b','#917e65','#715f4e','#504438','#302a24']),
  limestone: makeRamp(['#fdfcf8','#f4f1e9','#e8e2d7','#d7cec1','#c3b7a6','#a99b88','#897d6e','#6b6256','#4e4840','#302c27']),
  dune: makeRamp(['#fffaf2','#f3e9d9','#e7d3b8','#d3b899','#ba9d7b','#9e8266','#806852','#655340','#4a3e31','#30281f']),
  mist: makeRamp(['#fcfdff','#eff4f5','#dfe9ed','#c5d9dd','#aac1c8','#8da8b2','#708c98','#54707b','#3a545e','#24383f']),
  pearl: makeRamp(['#ffffff','#f6f4f2','#eae5e2','#d8cfca','#c1b4ae','#a99a94','#8d7f79','#6e645f','#4e4946','#302e2c']),
  fog: makeRamp(['#fbfcfa','#eff2ed','#dce4da','#c7d4c7','#acbfad','#8fa795','#718875','#586f60','#405647','#29392f']),
  eucalyptus: makeRamp(['#f8fbf6','#eef2e9','#dbe4d6','#c3d1c1','#a8bda9','#8ba58e','#6e8c73','#536d59','#3b5141','#24382d']),
  mushroom: makeRamp(['#fdfaf7','#f3ece5','#e6d9cf','#d4c1b6','#bda69a','#a08b82','#817169','#665950','#4c433c','#302b28']),
  mineral: makeRamp(['#f8fafb','#edf1f3','#dce4e8','#c4d2d8','#a8bcc5','#8ca4b0','#718b98','#556f7b','#3b5360','#253943']),
  alabaster: makeRamp(['#ffffff','#faf8f2','#eeebe1','#e0dace','#ccc3b2','#b4a895','#978a78','#766c5c','#544c41','#332d27']),
  desert: makeRamp(['#fbf7ec','#eae1cd','#d6c6a8','#baa480','#9a8363','#7b6952','#625441','#4c4235','#373129','#25211e']),
  cinder: makeRamp(['#f2f1ef','#dfddd8','#c6c3bc','#a9a49c','#89857e','#6e6a64','#56534f','#403f3c','#2e2d2c','#1f2020']),
  basalt: makeRamp(['#edf1ee','#d5dcd6','#b7c3ba','#96a69b','#79897f','#616f67','#4c5952','#39463f','#29352f','#1b2722']),
  oliveDrab: makeRamp(['#f3f3e8','#e1e3ce','#c9cba9','#adb188','#90956e','#737a57','#5b6246','#464c38','#343a2e','#22291f']),
})
