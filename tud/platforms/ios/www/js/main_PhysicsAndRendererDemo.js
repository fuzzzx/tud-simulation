requirejs.config({
    // The shim loads Box2D as if it were a
    // module written for require.js.
    shim: {
        'lib/Box2dWeb': {
                //Once loaded, use the global 'Box2D' as the
                //module value.
                exports: 'Box2D'
        }
    },

    paths: {
        jquery: "https://ajax.googleapis.com/ajax/libs/jquery/2.1.1/jquery.min"
    }

});

require([
      "jquery"
    , "lib/Box2dWeb"
    , "lib/pixi"
    , "app/PhysicsBox"
    ], function ($, Box2D, PIXI, PhysicsBox) {


    // console.log($);
    // console.log(Box2D);
    // console.log(PIXI);
    // console.log(PhysicsBox);

// ----------
// Box2D Init
// ----------

    // Variable Simplification
    var                     b2Vec2 = Box2D.Common.Math.b2Vec2
        ,                   b2AABB = Box2D.Collision.b2AABB
        ,                b2BodyDef = Box2D.Dynamics.b2BodyDef
        ,                   b2Body = Box2D.Dynamics.b2Body
        ,             b2FixtureDef = Box2D.Dynamics.b2FixtureDef
        ,                b2Fixture = Box2D.Dynamics.b2Fixture
        ,                  b2World = Box2D.Dynamics.b2World
        ,               b2MassData = Box2D.Collision.Shapes.b2MassData
        ,           b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
        ,            b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
        ,              b2DebugDraw = Box2D.Dynamics.b2DebugDraw
        ,          b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef
        ;


    // Create World (In the simulation, we will create a new world for each creature)
    var world = new b2World( new b2Vec2(0, 10), true);


    var fixDef = new b2FixtureDef;
    fixDef.density = 1.0;
    fixDef.friction = 0.5;
    fixDef.restitution = 0.2;

    var bodyDef = new b2BodyDef;

    //create ground
    bodyDef.type = b2Body.b2_staticBody;
    fixDef.shape = new b2PolygonShape;
    fixDef.shape.SetAsBox(20, 2);
    bodyDef.position.Set(10, 400 / 30 + 1.8);
    world.CreateBody(bodyDef).CreateFixture(fixDef);
    bodyDef.position.Set(10, -1.8);
    world.CreateBody(bodyDef).CreateFixture(fixDef);
    fixDef.shape.SetAsBox(2, 14);
    bodyDef.position.Set(-1.8, 13);
    world.CreateBody(bodyDef).CreateFixture(fixDef);
    bodyDef.position.Set(21.8, 13);
    world.CreateBody(bodyDef).CreateFixture(fixDef);

    // Create boxes and add to the world
    PhysicsBox.SetMeterLength(30); // Pixi coordinates per meter in Box2D
    var boxes = [];
    for (var i = 0; i < 10; ++i) {
        var box = new PhysicsBox(1, 1);
        box.addToB2World(Math.random() * 10, Math.random() * 10, world);
        boxes.push(box);
    }

    //---------------------------------------------------

    function debugRendererInit() {

        //setup debug draw
        var debugDraw = new b2DebugDraw();
        debugDraw.SetSprite(document.getElementById("canvas").getContext("2d"));
        debugDraw.SetDrawScale(30.0);
        debugDraw.SetFillAlpha(0.5);
        debugDraw.SetLineThickness(1.0);
        debugDraw.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);
        world.SetDebugDraw(debugDraw);

        window.setInterval(update, 1000 / 60);

        //mouse

        var mouseX, mouseY, mousePVec, isMouseDown, selectedBody, mouseJoint;
        var canvasPosition = getElementPosition(document.getElementById("canvas"));

        document.addEventListener("mousedown", function(e) {
             isMouseDown = true;
             handleMouseMove(e);
             document.addEventListener("mousemove", handleMouseMove, true);
        }, true);

        document.addEventListener("mouseup", function() {
             document.removeEventListener("mousemove", handleMouseMove, true);
             isMouseDown = false;
             mouseX = undefined;
             mouseY = undefined;
        }, true);

        function handleMouseMove(e) {
             mouseX = (e.clientX - canvasPosition.x) / 30;
             mouseY = (e.clientY - canvasPosition.y) / 30;
        };

        function getBodyAtMouse() {
             mousePVec = new b2Vec2(mouseX, mouseY);
             var aabb = new b2AABB();
             aabb.lowerBound.Set(mouseX - 0.001, mouseY - 0.001);
             aabb.upperBound.Set(mouseX + 0.001, mouseY + 0.001);

             // Query the world for overlapping shapes.

             selectedBody = null;
             world.QueryAABB(getBodyCB, aabb);
             return selectedBody;
        }

        function getBodyCB(fixture) {
             if(fixture.GetBody().GetType() != b2Body.b2_staticBody) {
                    if(fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), mousePVec)) {
                         selectedBody = fixture.GetBody();
                         return false;
                    }
             }
             return true;
        }

        //update

        function update() {

             if(isMouseDown && (!mouseJoint)) {
                    var body = getBodyAtMouse();
                    if(body) {
                         var md = new b2MouseJointDef();
                         md.bodyA = world.GetGroundBody();
                         md.bodyB = body;
                         md.target.Set(mouseX, mouseY);
                         md.collideConnected = true;
                         md.maxForce = 300.0 * body.GetMass();
                         mouseJoint = world.CreateJoint(md);
                         body.SetAwake(true);
                    }
             }

             if(mouseJoint) {
                    if(isMouseDown) {
                         mouseJoint.SetTarget(new b2Vec2(mouseX, mouseY));
                    } else {
                         world.DestroyJoint(mouseJoint);
                         mouseJoint = null;
                    }
             }

        };

        //helpers

        //http://js-tut.aardon.de/js-tut/tutorial/position.html
        function getElementPosition(element) {
             var elem=element, tagname="", x=0, y=0;

             while((typeof(elem) == "object") && (typeof(elem.tagName) != "undefined")) {
                    y += elem.offsetTop;
                    x += elem.offsetLeft;
                    tagname = elem.tagName.toUpperCase();

                    if(tagname == "BODY")
                         elem=0;

                    if(typeof(elem) == "object") {
                         if(typeof(elem.offsetParent) == "object")
                                elem = elem.offsetParent;
                    }
             }

             return {x: x, y: y};
        }
    };


//---------------------------------------------------

// PIXI Setup

    function pixiRendererInit() {
        // PIXI Init stuff
        var stage = new PIXI.Stage(0x66FF99);
        var renderer = PIXI.autoDetectRenderer(600, 400);
        document.body.appendChild(renderer.view);

        boxes.forEach( function (box){
            box.addToPIXIStage(stage);
        });



        requestAnimFrame( animate );


        function animate() {
            requestAnimFrame( animate );

            world.Step(1 / 60, 10, 10);

            world.DrawDebugData();
            boxes.forEach( function (box) {
                box.update();
            });
            renderer.render( stage );

            world.ClearForces();
        }

    }




    $( document ).ready(function(){
        debugRendererInit();
        pixiRendererInit();
    });


});