// Země, Měsíc a roční období. Soubory v js/ sdílejí jeden prostor jmen a načítají se v pořadí podle čísla.
/* ---------- Země: den, noc a stín Měsíce při zatmění ---------- */
const dayT = tex('earth_daymap.jpg'), nightT = tex('earth_nightmap.jpg'), moonT = tex('moon.jpg'), sunT = tex('sun.jpg');
const cloudT = tex('earth_clouds.jpg'); cloudT.wrapS = THREE.RepeatWrapping;
const cloudShift = { value: 0 }, cloudOn = { value: 1 }; // cloudOn = vrstva oblačnosti, 0 ji vypne
function earthMat(sunDir, moonPos) {
  return new THREE.ShaderMaterial({
    uniforms: { dayT: { value: dayT }, nightT: { value: nightT }, cloudT: { value: cloudT }, shift: cloudShift, clouds: cloudOn, sunDir: { value: sunDir }, moonPos: { value: moonPos || V() }, ecl: { value: 0 } },
    vertexShader: 'varying vec2 vUv;varying vec3 vN;varying vec3 vP;void main(){vUv=uv;vN=normalize(mat3(modelMatrix)*normal);vP=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform sampler2D dayT,nightT,cloudT;uniform vec3 sunDir,moonPos;uniform float ecl,shift,clouds;varying vec2 vUv;varying vec3 vN;varying vec3 vP;void main(){float d=dot(normalize(vN),sunDir);float k=smoothstep(-0.12,0.18,d);vec3 dc=texture2D(dayT,vUv).rgb;float cl=texture2D(cloudT,vec2(vUv.x+shift,vUv.y)).r*clouds;vec3 day=mix(dc,vec3(1.0),cl*0.85)*(0.45+0.75*max(d,0.0));vec3 night=texture2D(nightT,vUv).rgb*1.4*(1.0-cl*0.6)+dc*0.05+vec3(cl*0.02);vec3 m=moonPos-vP;float al=dot(m,sunDir);float sh=ecl*step(0.0,al)*(1.0-smoothstep(0.08,0.3,length(m-al*sunDir)));gl_FragColor=vec4(mix(night,day,k)*(1.0-0.93*sh),1.0);}'
  });
}
// tenká modrá záře na okraji, silnější na osvětlené straně
function atmosphere(r, sunDir) {
  return new THREE.Mesh(new THREE.SphereGeometry(r * 1.04, 48, 32), new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: sunDir } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    vertexShader: 'varying vec3 vN;varying vec3 vP;void main(){vN=normalize(mat3(modelMatrix)*normal);vP=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 sunDir;varying vec3 vN;varying vec3 vP;void main(){vec3 n=normalize(vN);float c=abs(dot(n,normalize(cameraPosition-vP)));float f=pow(1.0-c,2.5)*smoothstep(0.0,0.25,c);float lit=smoothstep(-0.3,0.4,dot(n,sunDir));gl_FragColor=vec4(vec3(0.35,0.6,1.0)*f*(0.12+0.88*lit)*1.6,1.0);}'
  }));
}
function axis(len) { return new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, -len, 0), V(0, len, 0)]), new THREE.LineBasicMaterial({ color: 0xffffff })); }
const homes = [];
function addHome(earthMesh, r) { const m = new THREE.Mesh(new THREE.SphereGeometry(.03 * r, 12, 8), basic(0xff5a4f)); m.userData.r = r * 1.01; earthMesh.add(m); homes.push(m); return m; }

/* ---------- Země a Měsíc ---------- */
const gE = new THREE.Group(); scene.add(gE);
const SUN_DIR = V(1), moonW = V();
const yaw = new THREE.Group(); gE.add(yaw); // natáčí sklon osy vůči Slunci podle data
const tilt = new THREE.Group(); tilt.rotation.z = rad(23.4); yaw.add(tilt);
const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), earthMat(SUN_DIR, moonW));
tilt.add(earth, axis(1.5), atmosphere(1, SUN_DIR));
const home = addHome(earth, 1);
const MOON_D = 5;
const moonPivot = new THREE.Group(); gE.add(moonPivot);
const moon = new THREE.Mesh(new THREE.SphereGeometry(.27, 32, 24), new THREE.MeshLambertMaterial({ map: moonT }));
moon.position.x = MOON_D; moonPivot.add(moon);
gE.add(ring(MOON_D));
const eLight = new THREE.DirectionalLight(0xffffff, 1.25); eLight.position.copy(SUN_DIR).multiplyScalar(10); gE.add(eLight);
gE.add(new THREE.AmbientLight(0xffffff, .04));
const farSun = glow(0xffe2a0, 18); farSun.position.copy(SUN_DIR).multiplyScalar(45); gE.add(farSun);
// vesmírná stanice: dráha je zvětšená a zpomalená, jinak by nebyla vidět
const issTilt = new THREE.Group(); issTilt.rotation.x = rad(51.6); gE.add(issTilt);
const issPivot = new THREE.Group(); issTilt.add(issPivot);
const iss = new THREE.Group(); iss.position.x = 1.14; issPivot.add(iss);
iss.add(new THREE.Mesh(new THREE.BoxGeometry(.014, .014, .05), basic(0xffffff)));
[-.02, .02].forEach(z => { const p = new THREE.Mesh(new THREE.BoxGeometry(.002, .09, .016), basic(0x4f86ff)); p.position.z = z; iss.add(p); });

/* ---------- Roční období ---------- */
const gY = new THREE.Group(); scene.add(gY);
const Y_R = 16, ySun = V(1);
gY.add(new THREE.Mesh(new THREE.SphereGeometry(3, 48, 32), new THREE.MeshBasicMaterial({ map: sunT })), glow(0xffa530, 16), ring(Y_R));
const yHolder = new THREE.Group(); gY.add(yHolder);
const yTilt = new THREE.Group(); yTilt.rotation.z = rad(23.4); yHolder.add(yTilt);
const yEarth = new THREE.Mesh(new THREE.SphereGeometry(2.5, 64, 48), earthMat(ySun));
yTilt.add(yEarth, axis(4), atmosphere(2.5, ySun));
const yHome = addHome(yEarth, 2.5);
const SEASONS = ['léto', 'podzim', 'zima', 'jaro'];
const seasonMarks = SEASONS.map((s, i) => { const o = new THREE.Object3D(), a = rad(45 + i * 90); o.position.set(Math.cos(a) * (Y_R + 5), 0, -Math.sin(a) * (Y_R + 5)); gY.add(o); return o; });
homes.forEach(m => m.position.copy(latLon(HOME[0], HOME[1])).multiplyScalar(m.userData.r));
