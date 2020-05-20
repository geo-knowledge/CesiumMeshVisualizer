
/// <reference path="../../../Source/ThirdParty/ammo.js-master/builds/ammo.js" />

/// <reference path="../common.js" />

//requirejs([
//       "../../../requirejs.config.js",
//       "../../../appconfig.js",
//       '../../../Source/Main',
//       '../common.js'
//], function (
//       config,
//       appconfig,
//       Cesium,
//       common
//       ) {
    MeshVisualizer = Cesium.MeshVisualizer;
    Mesh = Cesium.Mesh;
    MeshMaterial = Cesium.MeshMaterial;
    FramebufferTexture = Cesium.FramebufferTexture;
    GeometryUtils = Cesium.GeometryUtils;
    MeshPhongMaterial = Cesium.MeshPhongMaterial;
    BasicMeshMaterial = Cesium.BasicMeshMaterial;

    LOD = Cesium.LOD;
    homePosition[2] = 50;
    init();

    var center = Cesium.Cartesian3.fromDegrees(homePosition[0], homePosition[1], 10);
    var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(center);

    var meshVisualizer = new MeshVisualizer({
        modelMatrix: modelMatrix,
        up: { y: 1 },
        referenceAxisParameter: {
            length: 100,
            width: 0.05,
            headLength: 2,
            headWidth: 0.1
        }
    });
    viewer.scene.primitives.add(meshVisualizer);
    meshVisualizer.showReference = true;//显示坐标轴



    function createRandomColor() {
        return Cesium.Color.fromRandom({ alpha: 255 })//fromRgba(Math.floor(Math.random() * (1 << 24)));
    }
    function createMaterial(color) {
        if (typeof  color==='string') {
           color = Cesium.Color.fromCssColorString(color)
        }else if (Cesium.defined(color)) {
            color = Cesium.Color.fromRgba(color).withAlpha(1);
        } else {
            color = createRandomColor();
        }
        return new MeshPhongMaterial({
            defaultColor: color,
            side: MeshMaterial.Sides.DOUBLE,
            translucent: false
        });
    }
    var groundMaterial = new MeshPhongMaterial({
        defaultColor: "rgb(200,200,200)",
        side: MeshMaterial.Sides.DOUBLE,
        translucent: false
    })
    Cesium.Cartesian3.prototype.set = function (x, y, z) {
        this.x = x; this.y = y; this.z = z;
    }
    Cesium.Cartesian2.prototype.set = function (x, y) {
        this.x = x; this.y = y;
    }
    Cesium.Quaternion.prototype.set = function (x, y, z, w) {
        this.x = x; this.y = y; this.z = z; this.w = w;
    }

    Ammo().then(function () {
        // - Global variables -

        // Graphics variables 
        var clock = new THREE.Clock();

        var mouseCoords = new THREE.Vector2();
        var raycaster = new THREE.Raycaster();
        var ballMaterial = createMaterial(0x202020);

        // Physics variables
        var gravityConstant = 7.8;
        var collisionConfiguration;
        var dispatcher;
        var broadphase;
        var solver;
        var physicsWorld;
        var margin = 0.05;

        var convexBreaker = new THREE.ConvexObjectBreaker();

        // Rigid bodies include all movable objects
        var rigidBodies = [];

        var pos = new THREE.Vector3();
        var quat = new THREE.Quaternion();
        var transformAux1 = new Ammo.btTransform();
        var tempBtVec3_1 = new Ammo.btVector3(0, 0, 0);

        var time = 0;

        var objectsToRemove = [];
        for (var i = 0; i < 500; i++) {
            objectsToRemove[i] = null;
        }
        var numObjectsToRemove = 0;

        var impactPoint = new THREE.Vector3();
        var impactNormal = new THREE.Vector3();

        function initPhysics() {

            // Physics configuration

            collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
            dispatcher = new Ammo.btCollisionDispatcher(collisionConfiguration);
            broadphase = new Ammo.btDbvtBroadphase();
            solver = new Ammo.btSequentialImpulseConstraintSolver();
            physicsWorld = new Ammo.btDiscreteDynamicsWorld(dispatcher, broadphase, solver, collisionConfiguration);
            physicsWorld.setGravity(new Ammo.btVector3(0, -gravityConstant, 0));

        }

        function createObject(mass, halfExtents, pos, quat, material) {

            //y，z调换位置
            var object = new THREE.Mesh(new THREE.BoxGeometry(halfExtents.x * 2, halfExtents.y * 2, halfExtents.z * 2), material);
            object.position.copy(pos);
            object.quaternion.copy(quat);
            //object.position.y += 3;
            convexBreaker.prepareBreakableObject(object, mass, new THREE.Vector3(), new THREE.Vector3(), true);

            createDebrisFromBreakableObject(object);
        }

        function createObjects() {

            // Ground
            pos.set(0, -0.5, 0);
            quat.set(0, 0, 0, 1);
            var ground = createParalellepipedWithPhysics(40, 1, 40, 0, pos, quat, createMaterial(  0xFFFFFF  ));
            
           

            // Tower 1
            var towerMass = 1000;
            var towerHalfExtents = new THREE.Vector3(2, 5, 2);
            pos.set(-8, 5, 0);
            quat.set(0, 0, 0, 1);
            createObject(towerMass, towerHalfExtents, pos, quat, createMaterial("rgb(247,174,255)"));

            // Tower 2
            pos.set(8, 5, 0);
            quat.set(0, 0, 0, 1);
            createObject(towerMass, towerHalfExtents, pos, quat, createMaterial("rgb(247,174,255)"));

            //Bridge
            var bridgeMass = 100;
            var bridgeHalfExtents = new THREE.Vector3(7, 0.2, 1.5);
            pos.set(0, 10.2, 0);
            quat.set(0, 0, 0, 1);
            createObject(bridgeMass, bridgeHalfExtents, pos, quat, createMaterial("rgb(247,174,255)"));

            // Stones
            var stoneMass = 120;
            var stoneHalfExtents = new THREE.Vector3(1, 2, 0.15);
            var numStones = 8;
            quat.set(0, 0, 0, 1);
            for (var i = 0; i < numStones; i++) {

                pos.set(0, 2, 15 * (0.5 - i / (numStones + 1)));

                createObject(stoneMass, stoneHalfExtents, pos, quat, createMaterial(0xB0B0B0));

            }

            // Mountain
            var mountainMass = 860;
            var mountainHalfExtents = new THREE.Vector3(4, 5, 4);
            pos.set(5, mountainHalfExtents.y * 0.5, -7);
            quat.set(0, 0, 0, 1);
            var mountainPoints = [];
            //y，z调换位置
            mountainPoints.push(new THREE.Vector3(mountainHalfExtents.x, -mountainHalfExtents.y, mountainHalfExtents.z));
            mountainPoints.push(new THREE.Vector3(-mountainHalfExtents.x, -mountainHalfExtents.y, mountainHalfExtents.z));
            mountainPoints.push(new THREE.Vector3(mountainHalfExtents.x, -mountainHalfExtents.y, -mountainHalfExtents.z));
            mountainPoints.push(new THREE.Vector3(-mountainHalfExtents.x, -mountainHalfExtents.y, -mountainHalfExtents.z));
            mountainPoints.push(new THREE.Vector3(0, mountainHalfExtents.y, 0));
            var mountain = new THREE.Mesh(new THREE.ConvexGeometry(mountainPoints), createMaterial("rgb(247,174,68)"));
            mountain.position.copy(pos);
            mountain.quaternion.copy(quat);
            convexBreaker.prepareBreakableObject(mountain, mountainMass, new THREE.Vector3(), new THREE.Vector3(), true);
            createDebrisFromBreakableObject(mountain);

        }

        function createParalellepipedWithPhysics(sx, sy, sz, mass, pos, quat, material) {
            var box = Cesium.BoxGeometry.createGeometry(Cesium.BoxGeometry.fromDimensions({
                dimensions: new Cesium.Cartesian3(sx, sy, sz),
                vertexFormat: new Cesium.VertexFormat({
                    position: true,
                    normal: true
                })
            }));
            var object = new Mesh(box, material);
            object.quaternion = new Cesium.Quaternion();
            var shape = new Ammo.btBoxShape(new Ammo.btVector3(sx * 0.5, sy * 0.5, sz * 0.5));
            shape.setMargin(margin);

            createRigidBody(object, shape, mass, pos, quat);

            return object;

        }

        function createDebrisFromBreakableObject(object) {

            object.castShadow = true;
            object.receiveShadow = true;

            var shape = createConvexHullPhysicsShape(object.geometry.vertices);
            shape.setMargin(margin);

            var body = createRigidBody(object, shape, object.userData.mass, null, null, object.userData.velocity, object.userData.angularVelocity);

            // Set pointer back to the three object only in the debris objects
            var btVecUserData = new Ammo.btVector3(0, 0, 0);
            btVecUserData.threeObject = object;
            body.setUserPointer(btVecUserData);

        }

        function removeDebris(object) {

            meshVisualizer.remove(object);

            physicsWorld.removeRigidBody(object.userData.physicsBody);

        }

        function createConvexHullPhysicsShape(points) {

            var shape = new Ammo.btConvexHullShape();

            for (var i = 0, il = points.length; i < il; i++) {
                var p = points[i];
                tempBtVec3_1.setValue(p.x, p.y, p.z);//y,z调换位置
                var lastOne = (i === (il - 1));
                shape.addPoint(tempBtVec3_1, lastOne);
            }

            return shape;
        }

        function createRigidBody(object, physicsShape, mass, pos, quat, vel, angVel) {

            if (pos) {
                object.position.copy(pos);

            }
            else {
                pos = object.position;
            }
            if (quat) {
                if (object.quaternion)
                    object.quaternion.copy(quat);
            }
            else {
                quat = object.quaternion;
            }

            var transform = new Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z));
            transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w));
            var motionState = new Ammo.btDefaultMotionState(transform);

            var localInertia = new Ammo.btVector3(0, 0, 0);
            physicsShape.calculateLocalInertia(mass, localInertia);

            var rbInfo = new Ammo.btRigidBodyConstructionInfo(mass, motionState, physicsShape, localInertia);
            var body = new Ammo.btRigidBody(rbInfo);

            body.setFriction(0.5);

            if (vel) {
                body.setLinearVelocity(new Ammo.btVector3(vel.x, vel.y, vel.z));
            }
            if (angVel) {
                body.setAngularVelocity(new Ammo.btVector3(angVel.x, angVel.y, angVel.z));
            }

            object.userData.physicsBody = body;
            object.userData.collided = false;

            meshVisualizer.add(object);

            if (mass > 0) {
                rigidBodies.push(object);

                // Disable deactivation
                body.setActivationState(4);
            }

            physicsWorld.addRigidBody(body);

            return body;
        }

        function updatePhysics(deltaTime) {

            // Step world
            physicsWorld.stepSimulation(deltaTime, 10);

            // Update rigid bodies
            for (var i = 0, il = rigidBodies.length; i < il; i++) {
                var objThree = rigidBodies[i];
                var objPhys = objThree.userData.physicsBody;
                var ms = objPhys.getMotionState();
                if (ms) {

                    ms.getWorldTransform(transformAux1);
                    var p = transformAux1.getOrigin();
                    var q = transformAux1.getRotation();
                    objThree.position.set(p.x(), p.y(), p.z());
                    if (objThree.quaternion) {
                        objThree.quaternion.set(q.x(), q.y(), q.z(), q.w());
                    }

                    objThree.userData.collided = false;
                    objThree.modelMatrixNeedsUpdate = true;
                }
            }

            for (var i = 0, il = dispatcher.getNumManifolds() ; i < il; i++) {

                var contactManifold = dispatcher.getManifoldByIndexInternal(i);
                var rb0 = contactManifold.getBody0();
                var rb1 = contactManifold.getBody1();

                var threeObject0 = Ammo.castObject(rb0.getUserPointer(), Ammo.btVector3).threeObject;
                var threeObject1 = Ammo.castObject(rb1.getUserPointer(), Ammo.btVector3).threeObject;

                if (!threeObject0 && !threeObject1) {
                    continue;
                }

                var userData0 = threeObject0 ? threeObject0.userData : null;
                var userData1 = threeObject1 ? threeObject1.userData : null;

                var breakable0 = userData0 ? userData0.breakable : false;
                var breakable1 = userData1 ? userData1.breakable : false;

                var collided0 = userData0 ? userData0.collided : false;
                var collided1 = userData1 ? userData1.collided : false;

                if ((!breakable0 && !breakable1) || (collided0 && collided1)) {
                    continue;
                }

                var contact = false;
                var maxImpulse = 0;
                for (var j = 0, jl = contactManifold.getNumContacts() ; j < jl; j++) {
                    var contactPoint = contactManifold.getContactPoint(j);
                    if (contactPoint.getDistance() < 0) {
                        contact = true;
                        var impulse = contactPoint.getAppliedImpulse();
                        if (impulse > maxImpulse) {
                            maxImpulse = impulse;
                            var pos = contactPoint.get_m_positionWorldOnB();
                            var normal = contactPoint.get_m_normalWorldOnB();
                            impactPoint.set(pos.x(), pos.y(), pos.z());
                            impactNormal.set(normal.x(), normal.y(), normal.z());
                        }
                        break;
                    }
                }

                // If no point has contact, abort
                if (!contact) {
                    continue;
                }

                // Subdivision

                var fractureImpulse = 250;

                if (breakable0 && !collided0 && maxImpulse > fractureImpulse) {

                    var debris = convexBreaker.subdivideByImpact(threeObject0, impactPoint, impactNormal, 1, 2, 1.5);

                    var numObjects = debris.length;
                    for (var j = 0; j < numObjects; j++) {

                        createDebrisFromBreakableObject(debris[j]);

                    }

                    objectsToRemove[numObjectsToRemove++] = threeObject0;
                    userData0.collided = true;

                }

                if (breakable1 && !collided1 && maxImpulse > fractureImpulse) {

                    var debris = convexBreaker.subdivideByImpact(threeObject1, impactPoint, impactNormal, 1, 2, 1.5);

                    var numObjects = debris.length;
                    for (var j = 0; j < numObjects; j++) {

                        createDebrisFromBreakableObject(debris[j]);

                    }

                    objectsToRemove[numObjectsToRemove++] = threeObject1;
                    userData1.collided = true;

                }

            }

            for (var i = 0; i < numObjectsToRemove; i++) {

                removeDebris(objectsToRemove[i]);

            }
            numObjectsToRemove = 0;

        }

        var ray = new Cesium.Ray();
        var clickRequest = false;
        var start = false;
        var hasInit = false;
        var startTime = new Date();
        var rayDir = new Cesium.Cartesian3();

        function initInput() {

            var scene = viewer.scene;
            var handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
            var lastMesh = null;
            handler.setInputAction(function (movement) {
                if (!clickRequest) {
                    Cesium.Cartesian2.clone(movement.position, mouseCoords);
                    clickRequest = true;
                }
            }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

        }

        function processClick() {

            if (clickRequest) {

                meshVisualizer.getPickRay(mouseCoords, ray);
                if (!ray) {
                    clickRequest = false;
                    return;
                }
                // Creates a ball
                var ballMass = 35;
                var ballRadius = 0.4;
                var ball = new Mesh(new Cesium.SphereGeometry({
                    radius: ballRadius,
                    stackPartitions: 14,
                    slicePartitions: 10
                }), ballMaterial);

                var ballShape = new Ammo.btSphereShape(ballRadius);
                ballShape.setMargin(margin);

                Cesium.Cartesian3.clone(ray.direction, rayDir);
                Cesium.Cartesian3.subtract(ray.origin, ray.direction, pos);

                quat.set(0, 0, 0, 1);
                var ballBody = createRigidBody(ball, ballShape, ballMass, pos, quat);
                //ballBody.setFriction(0.5);

                Cesium.Cartesian3.normalize(rayDir, rayDir);
                Cesium.Cartesian3.multiplyByScalar(rayDir, 50, rayDir);
                //console.log(rayDir);
                ballBody.setLinearVelocity(new Ammo.btVector3(rayDir.x, rayDir.y, rayDir.z));

                clickRequest = false;

            }

        }
        var hs = false;
        function update(frameState) {
            if (hs)
                return;
            var deltaTime = (new Date() - startTime) / 1000.0;
            updatePhysics(deltaTime);
            processClick();
            startTime = new Date();
            // hs = true;
        }
        setTimeout(function () {
            if (!hasInit) {
                // - Init - 

                initPhysics();

                createObjects();

                initInput();

                hasInit = true;
            }
            if (!start) {
                startTime = new Date();
                meshVisualizer.beforeUpdate.addEventListener(update);
                start = true;
            } else {
                meshVisualizer.beforeUpdate.removeEventListener(update);
                start = false;

            }
        }, 1000 * 3);
    });

//});
