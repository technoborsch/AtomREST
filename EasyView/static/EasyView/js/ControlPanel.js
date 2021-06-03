import {GUI} from "../../threejs/examples/jsm/libs/dat.gui.module.js";

GUI.TEXT_CLOSED = 'Закрыть панель управления';
GUI.TEXT_OPEN = 'Открыть панель управления';

export default class ControlPanel {
    //Control panel with sectioning, notes disabling button and so on
    constructor( clipPlanes, scene, renderFunction ) {
        this.params = {
            planeConstantX: 0,
            planeConstantXNeg: 0,
            planeConstantY: 0,
            planeConstantYNeg: 0,
            planeConstantZ: 0,
            planeConstantZNeg: 0,
            areNotesShowed: true,
        };
        this.gui = new GUI();
        this.clipPlanes = clipPlanes;
        this.scene = scene;
        this.renderFunction = renderFunction;
    }

    setControls( boundBox ) {
        //Set all necessary controls off given bound box of a model

        const clipping = this.gui.addFolder('Сечения');
        [
            ['planeConstantY', 'y', 2, 'Сверху'], ['planeConstantYNeg', 'y', 3, 'Снизу'],
            ['planeConstantX', 'x', 0, 'Спереди'], ['planeConstantXNeg', 'x', 1, 'Сзади'],
            ['planeConstantZ', 'z', 4, 'Слева'], ['planeConstantZNeg', 'z', 5, 'Справа'],

        ].forEach( (case_) => {
            clipping.add( this.params, case_[0], boundBox.min[case_[1]], boundBox.max[case_[1]] )
                .step( 10 )
                .name( case_[3] )
                .onChange( (value) => {
                    this.clipPlanes[case_[2]].constant = (-1) ** case_[2] * value;
                    this.renderFunction();
                } )
        } );

        //Option to hide/show notes
		this.gui.add( this.params, 'areNotesShowed' )
            .name( 'Заметки' )
            .onChange( ( value ) => {
                this.scene.traverse( (o) => {
                    if (o.isSprite) {
                        o.material.visible = value;
                    }
                } );
                this.renderFunction();
            });

        //To make it appear opened
        clipping.open();

    }

    setClipping( boundBox, clipPlanes, clipConstants ) {
        //Manipulate with clipping planes here
        let array = [boundBox.max.x, boundBox.min.x, boundBox.max.y, boundBox.min.y, boundBox.max.z, boundBox.min.z];
        const paramsArray = [
            'planeConstantX', 'planeConstantXNeg',
            'planeConstantY', 'planeConstantYNeg',
            'planeConstantZ', 'planeConstantZNeg'
        ]
        if (clipConstants) {
            array = clipConstants;
        }
        for (let i = 0; i < array.length; i++) {
            clipPlanes[i].constant = (-1)**i * array[i];
            this.params[paramsArray[i]] = array[i];
        }
    }
}
