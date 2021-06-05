import {GUI} from "../../threejs/examples/jsm/libs/dat.gui.module.js";

GUI.TEXT_CLOSED = 'Закрыть панель управления';
GUI.TEXT_OPEN = 'Открыть панель управления';

export default class ControlPanel {
    // Control panel with sectioning, notes disabling button and so on
    constructor( engine ) {
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
        this.engine = engine;
        window.addEventListener('resize', this.handleResizing.bind(this));
        this.handleResizing();
    }

    setControls() {
        // Set all necessary controls off given engine
        const clipping = this.gui.addFolder('Сечения');
        [
            ['planeConstantY', 'y', 2, 'Сверху'], ['planeConstantYNeg', 'y', 3, 'Снизу'],
            ['planeConstantX', 'x', 0, 'Спереди'], ['planeConstantXNeg', 'x', 1, 'Сзади'],
            ['planeConstantZ', 'z', 4, 'Слева'], ['planeConstantZNeg', 'z', 5, 'Справа'],

        ].forEach( (case_) => {
            clipping.add(this.params, case_[0], this.engine.boundBox.min[case_[1]], this.engine.boundBox.max[case_[1]])
                .step( 10 )
                .name( case_[3] )
                .onChange( (value) => {
                    this.engine.clipPlanes[case_[2]].constant = (-1) ** case_[2] * value;
                    this.engine.render();
                } )
        } );

        //Option to hide/show notes
		this.gui.add( this.params, 'areNotesShowed' )
            .name( 'Заметки' )
            .onChange( ( value ) => {
                this.engine.scene.traverse( (o) => {
                    if (o.isSprite) {
                        o.material.visible = value;
                    }
                } );
                this.engine.render();
            });

        clipping.open(); // To make it appear opened

    }

    setClipping( clipConstants ) { //TODO move to engine
        // Manipulate with clipping planes here. Should be called after each changing of a viewpoint
        const boundBox = this.engine.boundBox;
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
            this.engine.clipPlanes[i].constant = (-1)**i * array[i];
            this.params[paramsArray[i]] = array[i];
        }
        this.setControls();
    }

    handleResizing() {
        // Should close if width of screen is lesser than given value
        if (window.innerWidth < 540) {
            this.gui.close();
        }
    }
}
