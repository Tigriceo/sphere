import * as THREE from 'three';

import TWEEN from '/js/three/tween.module.js';
import { TrackballControls } from '/js/three/TrackballControls.js';
import { OrbitControls } from '/js/three/OrbitControls.js';
import { CSS3DRenderer, CSS3DObject } from '/js/three/CSS3DRenderer.js'; 
import { FontLoader } from '/js/three/FontLoader.js';
import { TextGeometry } from '/js/three/TextGeometry.js';



const table = [];
for (let i = 1; i <= 67; i++) {
    table.push({ img: `images/test/image-${i}.png`, name: `Test ${i}` });
}

let camera, scene, renderer, controls;
const container = document.getElementById('container'),
    objects = [],
    targets = { table: [], sphere: [] },
    fontUrl = '/js/three/font/gentilis_regular.typeface.json';

init();
animate();

function init() {
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 3000;
    scene = new THREE.Scene();

    // table
    for (let i = 0; i < table.length; i++) {

        // Создаем контейнер для элемента
        const element = document.createElement('div');
        element.className = 'element';

        // Создаем изображение
        const img = document.createElement('img');
        img.src = table[i].img;
        img.alt = table[i].name;
        img.className = 'element-image';
        element.appendChild(img);

        // Создаем подпись (текст)
        const caption = document.createElement('div');
        caption.className = 'caption';
        caption.textContent = table[i].name;
        element.appendChild(caption);

        // Создаем CSS3DObject
        const objectCSS = new CSS3DObject(element);
        objectCSS.position.x = Math.random() * 4000 - 2000;
        objectCSS.position.y = Math.random() * 4000 - 2000;
        objectCSS.position.z = Math.random() * 4000 - 2000;

        scene.add(objectCSS);
        objects.push(objectCSS);
    }

    // sphere

    const vector = new THREE.Vector3();
    const goldenRatio = (1 + Math.sqrt(5)) / 2; // Фи

    for (let i = 0; i < objects.length; i++) {
        const y = 1 - (i / (objects.length - 1)) * 2; // От -1 до 1
        const radius = Math.sqrt(1 - y * y); // Радиус на этой высоте
        const theta = 2 * Math.PI * i / goldenRatio; // Угол

        const object = new THREE.Object3D();
        object.position.set(
            800 * radius * Math.cos(theta),
            800 * y,
            800 * radius * Math.sin(theta)
        );
        object.scale.set(1.5, 1.5, 1.5);

        vector.copy(object.position).multiplyScalar(2);
        object.lookAt(vector);
        targets.sphere.push(object);
    }

    renderer = new CSS3DRenderer();

    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    //
    controls = new TrackballControls(camera, renderer.domElement);
    controls.minDistance = 500;
    controls.maxDistance = 6000;
    controls.addEventListener('change', render);

    transform(targets.sphere, 2000);
    //
    window.addEventListener('resize', onWindowResize);

}
function transform(targets, duration) {
    TWEEN.removeAll();
    for (let i = 0; i < objects.length; i++) {
        const object = objects[i];
        const target = targets[i];

        new TWEEN.Tween(object.position)
            .to({ x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();

        new TWEEN.Tween(object.rotation)
            .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
    }

    new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(render)
        .start();
}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}
function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
}
// показ изображений после того как сфера софрмирована
// showImages() {
//     // console.log(this.objects);
//     this.objects.forEach((obj, index) => {
//         if (!obj.userData || !obj.userData.imgMesh.material) return;

//         obj.userData.imgMesh.visible = true; // Включаем отрисовку

//         if (obj.userData.imgMesh.userData.opacityTween) {
//             obj.userData.imgMesh.userData.opacityTween.stop();
//         }

//         obj.userData.imgMesh.userData.opacityTween = new TWEEN.Tween(obj.userData.imgMesh.material)
//             .to({ opacity: 1 }, 1000) // Плавное появление за 1 секунду
//             .delay(index * 50) // Легкая задержка между объектами
//             .easing(TWEEN.Easing.Quadratic.Out)
//             .onComplete((that) => {
//                 // console.log('s');
//             })
//             .start();

//         // ставим прозрачность фона после показа фото
//         if (!obj.userData.shadowMaterial) return;
//         let stime = (this.table.length * 5) + (index * 60);
//         setTimeout(() => {
//             this.animateShadowOpacity(obj.userData.shadowMaterial, this.boxInfo.hoverBoxInActive);
//         }, stime)

//     });
// }
function render() {
    renderer.render(scene, camera);
}