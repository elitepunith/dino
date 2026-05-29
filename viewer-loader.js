import * as THREE from "./node_modules/three/build/three.module.min.js";

window.THREE = THREE;
window.dispatchEvent(new Event("three-ready"));
