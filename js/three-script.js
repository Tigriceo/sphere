import * as THREE from 'three';
import TWEEN from '../js/three/tween.module.js';
import { OrbitControls } from '../js/three/OrbitControls.js';
import { FontLoader } from '../js/three/FontLoader.js';
import Stats from '../js/three/stats.module.js'; // FPS , отключить на проде
// https://threejs.org/examples/webgl_geometry_shapes.html пример геометрии
class LS_Core {
    constructor() {
        this.table = [];
        this.camera;
        this.scene;
        this.renderer;
        this.controls;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.lastCameraPosition = new THREE.Vector3();
        this.hoveredObject = null;
        this.container = document.getElementById('container');
        this.sphereTransformed = false;
        this.sphereRadius = 800; // радиус сферы
        this.visibleObjects = 91; // Ограничение на видимые объекты
        this.objects = [];
        this.objectSize = {
            imgWidth: 200, // изображение
            imgHeight: 200, // изображение
            shadowGeometryWidth: 210, // тень/зиливка
            shadowGeometryHeight: 270, // тень/зиливка
            frameGeometryWidth: 210, // рамка
            frameGeometryHeight: 270, // рамка
        };
        this.objectsToLoad = []; // Создаём массив для контроля загрузки
        this.targets = { sphere: [] };
        this.fontUrl = './fonts/uni_sans_bold_regular.json';
        this.arrangeTime = 2000; // время раскрытия сферы
        // х-ки бокса с картинкой и текстом
        this.boxInfo = {
            hoverBoxBackColor: 'rgb(21,68,138)', // цвет фоно бокса ..new THREE.Color
            hoverBoxActive: 0.2, // ховер opacity бокса
            hoverBoxInActive: 0, // ховер opacity бокса
            textColor: 'rgb(21,68,138)', // rgb(82, 95, 122)
        }

        this.stats = Stats(); // FPS , отключить на проде
        this.init();
    }

    init() {
        if (!THREE || !TWEEN || !this.container) return;
        this.addPhotos();
        this.initThreeRender();
        this.animate();
        this.showFPS(); // FPS , отключить на проде
        console.log(this)
    }

    showFPS() {
        document.body.appendChild(this.stats.dom)
    }

    addPhotos() {
        for (let i = 1; i <= 91; i++) {
            this.table.push({ img: `images/test/avif/image-${i}.avif`, name: `Test ${i}` });
            // this.table.push({ img: `images/test/avif/image-${i}.avif`, name: `Test1 ${i}` });
            // this.table.push({ img: `images/test/avif/image-${i}.avif`, name: `Test2 ${i}` });
            // this.table.push({ img: `images/test/avif/image-${i}.avif`, name: `Test3 ${i}` });
            // this.table.push({ img: `images/test/avif/image-${i}.avif`, name: `Test4 ${i}` });
        }
    }

    initThreeRender() {
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
        this.camera.position.z = 3000;
        this.scene = new THREE.Scene();

        // WebGLRenderer с поддержкой прозрачности
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Добавляем мягкий источник света
        this.light = new THREE.DirectionalLight(0xffffff, 1);
        this.light.position.set(0, 500, 500);
        this.light.castShadow = true;
        this.light.lookAt(new THREE.Vector3(0, 0, 0));
        this.scene.add(this.light);

        // Улучшаем параметры теней
        this.light.shadow.mapSize.width = 2048;
        this.light.shadow.mapSize.height = 2048;
        this.light.shadow.camera.near = 0.5;
        this.light.shadow.camera.far = 5000;
        this.light.shadow.camera.left = -500;
        this.light.shadow.camera.right = 500;
        this.light.shadow.camera.top = 500;
        this.light.shadow.camera.bottom = -500;

        // Добавляем рассеянный свет для лучшей видимости
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Загружаем шрифт перед созданием объектов
        const fontLoader = new FontLoader();
        fontLoader.load(this.fontUrl, (font) => {
            this.createObjects(font);
        });

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.autoRotate = false; // автопопворот
        this.controls.autoRotateSpeed = 1; // скорость автоповорота
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.02;
        this.controls.minDistance = 1300;
        this.controls.maxDistance = 3800;
        // this.controls.maxPolarAngle = Math.PI / 4;
        // this.controls.minPolarAngle = 0;
        // this.controls.maxPolarAngle = 1;
        console.log(this.controls);
        window.addEventListener('resize', () => this.onWindowResize());
        window.addEventListener('mousemove', (event) => this.onMouseMove(event));
        // window.addEventListener('click', () => this.handleClick());
    }

    createObjects(font) {
        // console.log(font);
        const textureLoader = new THREE.TextureLoader();
        textureLoader.anisotropy = this.renderer.capabilities.getMaxAnisotropy(); // Оптимизация четкости текстур
        for (let i = 0; i < this.table.length; i++) {
            //const texture = textureLoader.load(this.table[i].img);

            // 1. Картинка
            const imgMaterial = new THREE.MeshBasicMaterial({
                //map: texture,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0,
            });
            const imgGeometry = new THREE.PlaneGeometry(this.objectSize.imgWidth, this.objectSize.imgHeight);
            const imgMesh = new THREE.Mesh(imgGeometry, imgMaterial);
            imgMesh.castShadow = true;
            imgMesh.frustumCulled = true;
            imgMesh.visible = false; // фото лучше показать после трансформации сферы, ибо падает FPS
            imgMesh.userData.imagePath = this.table[i].img; // Сохраняем путь к изображению
            imgMesh.userData.imageLoaded = false; // Флаг загруженного изображения
            imgMesh.userData.imageLoading = false; // Добавляем флаг загрузки
            imgMesh.userData.opacityTween = null; // Сохраняем TWEEN-анимацию

            // 2. Белая тень (полупрозрачный белый прямоугольник)
            const shadowMaterial = new THREE.MeshBasicMaterial({
                color: this.boxInfo.hoverBoxBackColor,
                transparent: true,
                opacity: this.boxInfo.hoverBoxActive // Прозрачность тени
            });
            const shadowGeometry = new THREE.PlaneGeometry(this.objectSize.shadowGeometryWidth, this.objectSize.shadowGeometryHeight); // Чуть больше картинки
            const shadowMesh = new THREE.Mesh(shadowGeometry, shadowMaterial);
            shadowMesh.position.set(0, 0, -5); // Чуть ниже и позади картинки
            shadowMesh.receiveShadow = true;
            shadowMesh.userData = { opacityTween: null }; // Инициализируем opacityTween в userData

            // 3. Текст
            const textMesh = this.createCaptionTexture(this.table[i].name);
            textMesh.position.set(0, -115, 0);
            textMesh.material.opacity = 0; // Текст скрыт по умолчанию
            textMesh.userData = { opacityTween: null }; // Инициализируем opacityTween в userData
            // textMesh.visible = false;


            // Создаём геометрию рамки (прямоугольник без заливки)
            const frameGeometry = new THREE.EdgesGeometry(new THREE.PlaneGeometry(this.objectSize.frameGeometryWidth, this.objectSize.frameGeometryHeight));
            const frameMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    glowColor: { value: new THREE.Color(0x00ffff) }, // Цвет свечения
                    intensity: { value: 2.5 } // Интенсивность свечения
                },
                vertexShader: `
                    varying vec3 vNormal;
                    void main() {
                        vNormal = normalize(normalMatrix * normal);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform vec3 glowColor;
                    uniform float intensity;
                    varying vec3 vNormal;
                    void main() {
                        float alpha = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
                        gl_FragColor = vec4(glowColor * intensity, alpha);
                    }
                `,
                // visible: false,
                // side: THREE.DoubleSide
            });

            const frameMesh = new THREE.LineSegments(frameGeometry, frameMaterial);
            frameMesh.position.set(0, 0, 1); // Чуть выше картинки
            frameMesh.visible = false;
            //Группа-контейнер
            const groupContainer = new THREE.Group();
            groupContainer.add(frameMesh);
            groupContainer.add(shadowMesh); // Добавляем тень первым слоем
            groupContainer.add(imgMesh);
            groupContainer.add(textMesh);

            groupContainer.position.set(
                Math.random() * 4000 - 2000,
                Math.random() * 4000 - 2000,
                Math.random() * 4000 - 2000
            );
            // Сохраняем для hover-анимации
            groupContainer.userData = { textMesh, imgMesh, shadowMaterial, frameMesh };
            groupContainer.visible = false;

            this.scene.add(groupContainer);
            this.objects.push(groupContainer);
            this.objectsToLoad.push(groupContainer);
        }

        this.arrangeSphere();
    }
    // отложенная загрузка изображений в поле видимости
    loadImageIfVisible(object, distanceVar = 3000) {
        const imgMesh = object.userData.imgMesh;
        if (imgMesh.userData.imageLoaded || imgMesh.userData.imageLoading) return; // Уже загружается или загружено

        const distance = imgMesh.position.distanceTo(this.camera.position);
        if (distance <= distanceVar) { // Только если объект достаточно близко
            console.log("Загружаем изображение:", imgMesh.userData.imagePath);
            imgMesh.userData.imageLoading = true; // Ставим флаг загрузки

            const textureLoader = new THREE.TextureLoader();
            textureLoader.load(imgMesh.userData.imagePath, (texture) => {
                imgMesh.material.map = texture;
                imgMesh.userData.imageLoaded = true;
                imgMesh.userData.imageLoading = false; // Сбрасываем флаг загрузки

                // Удаляем объект из списка загрузки
                this.objectsToLoad = this.objectsToLoad.filter(obj => obj !== object);
            });
            // смотрим что осталось загрузить
            // if (this.objectsToLoad && this.objectsToLoad.length)
            //     console.log(this.objectsToLoad, this.objectsToLoad.length);
        }
    }
    // Расположение объектов в форме сферы
    arrangeSphere() {
        const visibleCount = Math.min(this.objects.length, this.visibleObjects); // Сколько объектов будет видно
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < this.objects.length; i++) {
            const object = new THREE.Object3D();
            const isVisible = i < visibleCount;

            if (isVisible) {
                const y = 1 - (i / (visibleCount - 1)) * 2;
                const radius = Math.sqrt(1 - y * y);
                const theta = goldenAngle * i;

                object.position.set(
                    this.sphereRadius * radius * Math.cos(theta),
                    this.sphereRadius * y,
                    this.sphereRadius * radius * Math.sin(theta)
                );
                object.lookAt(new THREE.Vector3());
            }

            object.visible = isVisible;
            this.targets.sphere.push(object);
        }

        this.transform(this.targets.sphere, this.arrangeTime);
    }
    // arrangeSphereAAA() {
    //     const goldenRatio = (1 + Math.sqrt(5)) / 2;
    //     for (let i = 0; i < this.objects.length; i++) {
    //         const y = 1 - (i / (this.objects.length - 1)) * 2;
    //         const radius = Math.sqrt(1 - y * y);
    //         const theta = 2 * Math.PI * i / goldenRatio;

    //         const object = new THREE.Object3D();
    //         object.position.set(800 * radius * Math.cos(theta), 800 * y, 800 * radius * Math.sin(theta));
    //         object.lookAt(new THREE.Vector3());

    //         this.targets.sphere.push(object);
    //     }
    //     this.transform(this.targets.sphere, this.arrangeTime);
    // }
    //Код (реализуем зонирование + загрузку изображений)
    updateObjectsVisibility() {
        const cameraPosition = this.camera.position.clone(); // Позиция камеры
        const sphereCenter = new THREE.Vector3(0, 0, 0); // Центр сферы

        // Проверяем, изменилась ли позиция камеры
        if (this.lastCameraPosition.x !== 0 && this.lastCameraPosition.distanceTo(cameraPosition) < 2) {
            return; // Если камера почти не двигалась, ничего не делаем
        }
        // Обновляем запомненную позицию камеры
        this.lastCameraPosition.copy(cameraPosition);

        const visibleObjects = [];
        const hiddenObjects = [];

        this.objects.forEach((object) => {
            const imgMesh = object.userData.imgMesh;
            if (!imgMesh) return;

            const objectPosition = object.position.clone();
            const direction = objectPosition.sub(sphereCenter).normalize();
            const cameraDirection = cameraPosition.clone().sub(sphereCenter).normalize();
            const dotProduct = direction.dot(cameraDirection); // Косинус угла между объектом и камерой

            let targetOpacity = 0;
            let targetVisible = false;

            // Определяем, в какой зоне находится объект
            if (dotProduct > 0.4) { // Передняя часть
                targetOpacity = 1;
                targetVisible = true;
                visibleObjects.push(object);
            } else {
                targetOpacity = 0;
                targetVisible = false;
                hiddenObjects.push(object);
            }

            object.visible = targetVisible;

            // Плавная смена прозрачности (чтобы не было резких скачков)
            if (imgMesh.material.opacity !== targetOpacity) {
                imgMesh.userData.opacityTween = new TWEEN.Tween(imgMesh.material)
                    .to({ opacity: targetOpacity }, 500)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .start();
            }

            // Загружаем изображения только для видимых объектов
            if (targetVisible && !imgMesh.userData.imageLoaded && !imgMesh.userData.imageLoading) {
                this.loadImageIfVisible(object);
                setTimeout(() => {
                    this.showSingleImage(object);
                }, this.sphereTransformed ? 0 : this.arrangeTime + 1000);
            }
        });

        // Если видимых объектов больше 20 — убираем лишние
        if (visibleObjects.length > 40) {
            visibleObjects.sort((a, b) =>
                a.position.distanceTo(sphereCenter) - b.position.distanceTo(sphereCenter)
            );
            visibleObjects.slice(40).forEach(obj => obj.visible = false);
        }
    }

    updateObjectsVisibilityA() {
        const cameraPosition = this.camera.position.clone(); // Позиция камеры
        const sphereCenter = new THREE.Vector3(0, 0, 0); // Центр сферы

        // Проверяем, изменилась ли позиция камеры
        if (this.lastCameraPosition.x !== 0 && this.lastCameraPosition.distanceTo(cameraPosition) < 2) {
            return; // Если камера почти не двигалась, ничего не делаем
        }
        // Обновляем запомненную позицию камеры
        this.lastCameraPosition.copy(cameraPosition);
        
        this.objects.forEach((object, index) => {
            const imgMesh = object.userData.imgMesh;
            if (!imgMesh) return;
            const isVisible = index < this.visibleObjects;
            object.visible = isVisible;
            if (!isVisible) return; // Пропускаем скрытые объекты
            // Вычисляем расстояние и угол объекта относительно камеры
            const objectPosition = object.position.clone();
            const distance = objectPosition.distanceTo(cameraPosition);
            const direction = objectPosition.clone().sub(sphereCenter).normalize();
            const cameraDirection = cameraPosition.clone().sub(sphereCenter).normalize();
            const dotProduct = direction.dot(cameraDirection); // Косинус угла между объектом и камерой
            let targetOpacity = 0;
            let targetVisible = false;
            let timeToShow = !this.sphereTransformed ? this.arrangeTime + 1000 : 0;

            // **ГЛАДКИЙ ПЕРЕХОД ПРОЗРАЧНОСТИ**
            const distanceFactor = THREE.MathUtils.clamp((4000 - distance) / 2000, 0, 1);

            // Определяем, в какой зоне находится объект
            if (dotProduct > 0.66) { // Ближняя треть
                targetOpacity = THREE.MathUtils.lerp(0.5, 1, distanceFactor);
                targetVisible = true;
            } else if (dotProduct > 0.33) { // Средняя треть
                targetOpacity = THREE.MathUtils.lerp(0, 0.5, distanceFactor);
                targetVisible = true;
            } else if (dotProduct > 0) { // Дальняя треть
                targetOpacity = 0;
                targetVisible = true;
            } else { // Самая дальняя часть (невидима)
                targetOpacity = 0;
                targetVisible = false;
            }

            // Устанавливаем видимость обьекта
            object.visible = targetVisible;
            // console.log(object);
            // Плавно изменяем прозрачность (чтобы не было резких скачков)
            if (imgMesh.material.opacity !== targetOpacity && (imgMesh.userData.imageLoaded || imgMesh.userData.imageLoading)) {
                imgMesh.userData.opacityTween = new TWEEN.Tween(imgMesh.material)
                    .to({ opacity: targetOpacity }, 500)
                    .easing(TWEEN.Easing.Quadratic.Out)
                    .start();
            }

            // Если объект в первых 2 зонах - загружаем изображение
            if (targetVisible && !imgMesh.userData.imageLoaded && !imgMesh.userData.imageLoading) {
                this.loadImageIfVisible(object);
                setTimeout(() => {
                    this.showSingleImage(object);
                    // console.log(this.objectsToLoad);
                }, timeToShow)
            }

        });
        // прячем заливку остальных обьектов что за кадром
        if (this.sphereTransformed && this.objectsToLoad.length > 0) {
            this.objectsToLoad.forEach((obj) => {
                if (obj.userData.shadowMaterial.opacity > 0)
                    this.animateShadowOpacity(obj.userData.shadowMaterial, 0);
            })
        }
    }


    // Генерация текстовой текстуры
    createCaptionTexture(text) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = 256;
        canvas.height = 64;

        ctx.fillStyle = this.boxInfo.textColor;
        ctx.font = 'Bold 32px UniSansBold';
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0 });
        const geometry = new THREE.PlaneGeometry(180, 50);

        return new THREE.Mesh(geometry, material);
    }

    showSingleImage(obj, index = 1) {
        // console.log(this.objects);
        if (!obj.userData || !obj.userData.imgMesh.material) return;

        obj.userData.imgMesh.visible = true; // Включаем отрисовку

        if (obj.userData.imgMesh.userData.opacityTween) {
            obj.userData.imgMesh.userData.opacityTween.stop();
        }

        obj.userData.imgMesh.userData.opacityTween = new TWEEN.Tween(obj.userData.imgMesh.material)
            .to({ opacity: 1 }, 1000) // Плавное появление за 1 секунду
            .delay(index * 50) // Легкая задержка между объектами
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();

        // ставим прозрачность фона после показа фото
        if (!obj.userData.shadowMaterial) return;
        let stime = (index * 60);
        setTimeout(() => {
            this.animateShadowOpacity(obj.userData.shadowMaterial, this.boxInfo.hoverBoxInActive);
        }, stime)
    }
    //Функция анимации прозрачности текста через TWEEN
    animateTextOpacity(target, targetOpacity) {
        if (!target || !target.material) return;
        //console.log(`Animating text opacity to ${targetOpacity}`);
        if (target.userData.opacityTween) {
            target.userData.opacityTween.stop();
        }
        target.userData.opacityTween = new TWEEN.Tween(target.material)
            .to({ opacity: targetOpacity }, 500)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }
    //Функция анимации прозрачности тени через TWEEN
    animateShadowOpacity(target, targetOpacity) {
        if (!target) return;
        //console.log(`Animating shadow opacity to ${targetOpacity}`);
        if (target.userData.opacityTween) {
            target.userData.opacityTween.stop();
        }
        target.userData.opacityTween = new TWEEN.Tween(target)
            .to({ opacity: targetOpacity }, 500)
            .easing(TWEEN.Easing.Quadratic.Out)
            .start();
    }

    // Проверка наведения мыши
    checkIntersections() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.objects, true);
        
        if (intersects.length > 0) {
            const object = intersects[0].object.parent;
            if (!object || !object.userData || object.userData.isHovered) return;
            //console.log(this.hoveredObject);
            if (this.hoveredObject === object) return; // Если объект уже выделен - ничего не делаем
            // console.log(this.hoveredObject);
            // Сбрасываем предыдущий ховер, если он был
            if (this.hoveredObject && this.hoveredObject !== object) {
                this.hoveredObject.userData.isHovered = false;
                this.animateTextOpacity(this.hoveredObject.userData.textMesh, 0); // ховер для текста
                this.animateShadowOpacity(this.hoveredObject.userData.shadowMaterial, this.boxInfo.hoverBoxInActive); // хочер для тени
                this.hoveredObject.userData.frameMesh ? (this.hoveredObject.userData.frameMesh.visible = false) : null; // ховер для рамки
            }
            // Новый ховер
            this.hoveredObject = object;
            this.hoveredObject.userData.isHovered = true;
            this.animateTextOpacity(this.hoveredObject.userData.textMesh, 1); // ховер для текста
            this.animateShadowOpacity(this.hoveredObject.userData.shadowMaterial, this.boxInfo.hoverBoxActive); // хочер для тени
            this.hoveredObject.userData.frameMesh ? (this.hoveredObject.userData.frameMesh.visible = true) : null; // ховер для рамки

        } else if (this.hoveredObject) {
            this.hoveredObject.userData.isHovered = false; // Если больше нет пересечений - сбрасываем ховер
            this.animateTextOpacity(this.hoveredObject.userData.textMesh, 0); // ховер для текста
            this.animateShadowOpacity(this.hoveredObject.userData.shadowMaterial, this.boxInfo.hoverBoxInActive); // хочер для тени
            this.hoveredObject.userData.frameMesh ? (this.hoveredObject.userData.frameMesh.visible = false) : null; // ховер для рамки
            this.hoveredObject = null;
        }
    }


    transform(targets, duration) {
        if (!targets || targets.length === 0) return; // Проверяем, есть ли вообще объекты
        TWEEN.removeAll();
        for (let i = 0; i < this.objects.length; i++) {
            new TWEEN.Tween(this.objects[i].position)
                .to(targets[i].position, Math.random() * duration + duration)
                .easing(TWEEN.Easing.Exponential.InOut)
                .onComplete(() => {
                    this.sphereTransformed = true;
                })
                .start();
        }
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    // поворот сферы к обьекту если по нему кликнули
    handleClick() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.objects, true);
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object.parent;
            if (!clickedObject) return;
            const distance = this.camera.position.length();// Сохраняем текущую дистанцию камеры
            const targetDirection = clickedObject.position.clone().normalize();// Получаем направление к объекту
            const newCameraPosition = targetDirection.multiplyScalar(distance);// Вычисляем новую позицию камеры с сохранением дистанции

            // Анимируем перемещение камеры
            new TWEEN.Tween(this.camera.position)
                .to({ x: newCameraPosition.x, y: newCameraPosition.y, z: newCameraPosition.z }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();

            // Анимируем взгляд камеры на объект
            new TWEEN.Tween(this.controls.target)
                .to({ x: clickedObject.position.x, y: clickedObject.position.y, z: clickedObject.position.z }, 1000)
                .easing(TWEEN.Easing.Quadratic.Out)
                .start();
        }
    }
    // проверка видимости обьекта
    // checkVisibleObjects() {
    //     if (!this.objectsToLoad || this.objectsToLoad.length < 1) return;
    //     this.objectsToLoad.forEach(obj => {
    //         this.loadImageIfVisible(obj);
    //     });
    // }


    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.checkIntersections();
        TWEEN.update();
        // Обновляем видимость и прозрачность объектов
        this.updateObjectsVisibility();
        // this.checkVisibleObjects(); // Проверяем объекты на видимость
        this.controls.update();
        // Поворачиваем каждый объект к камере
        this.objects.forEach((group) => {
            group.quaternion.copy(this.camera.quaternion);
        });
        
        this.renderer.render(this.scene, this.camera);

        ////
        this.stats.update(); // FPS , отключить на проде
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
new LS_Core();