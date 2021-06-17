import {GUI} from "../../threejs/examples/jsm/libs/dat.gui.module.js";

GUI.TEXT_CLOSED = 'Закрыть панель управления';
GUI.TEXT_OPEN = 'Открыть панель управления';

export default class ControlPanel {
    // Control panel with sectioning, notes disabling button and so on
    constructor( engine ) {
        this.params = {
            planeConstantY: 0,
            planeConstantYNeg: 0,
            planeConstantZ: 0,
            planeConstantZNeg: 0,
            planeConstantXNeg: 0,
            planeConstantX: 0,
            areNotesShowed: true,
        };
        this.gui = new GUI();
        this.engine = engine;
        this.controlsWereSet = false;
        window.addEventListener('resize', this.handleResizing.bind(this));
        this.handleResizing();
    }

    setControls() {
        // Set all necessary controls off given engine
        const clipping = this.gui.addFolder('Сечения');
        [
            ['planeConstantY', 'y', 0, 'Сверху'], ['planeConstantYNeg', 'y', 1, 'Снизу'],
            ['planeConstantX', 'x', 4, 'Спереди'], ['planeConstantXNeg', 'x', 5, 'Сзади'],
            ['planeConstantZ', 'z', 2, 'Слева'], ['planeConstantZNeg', 'z', 3, 'Справа'],

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

        if (!this.controlsWereSet) {
            this.controlsWereSet = true;
        }

    }

    setClipping( clipConstants ) { //TODO move to engine
        // Manipulate with clipping planes here. Should be called after each changing of a viewpoint
        const boundBox = this.engine.boundBox;
        let array = [boundBox.max.y, -boundBox.min.y, boundBox.max.z, -boundBox.min.z, boundBox.max.x, -boundBox.min.x];
        const paramsArray = [
            'planeConstantY', 'planeConstantYNeg',
            'planeConstantZ', 'planeConstantZNeg',
            'planeConstantX', 'planeConstantXNeg',
        ]
        if (clipConstants) {
            array = clipConstants.map( num => -num );
            let a = -clipConstants[5];
            let b = -clipConstants[4];
            array[4] = a;
            array[5] = b; // Has to do this swap for some reason
        }
        for (let i = 0; i < array.length; i++) {
            this.engine.clipPlanes[i].constant = array[i];
            this.params[paramsArray[i]] = (-1) ** i * array[i];  // Should change sign in this exact order
        }
        if (!this.controlsWereSet) {
            this.setControls();
        }
        this.gui.updateDisplay();
    }

    handleResizing() {
        // Should close if width of screen is lesser than given value
        if (window.innerWidth < 540) {
            this.gui.close();
        }
    }
}
