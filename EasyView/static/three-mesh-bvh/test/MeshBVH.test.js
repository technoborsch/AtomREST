import {
	Mesh,
	BufferGeometry,
	SphereBufferGeometry,
	InterleavedBufferAttribute,
	InterleavedBuffer,
	BoxBufferGeometry,
	Raycaster,
	MeshBasicMaterial,
	TorusBufferGeometry,
	BufferAttribute
} from 'three';
import { MeshBVH, acceleratedRaycast, computeBoundsTree, disposeBoundsTree, getBVHExtremes, MeshBVHDebug } from '../src/index.js';

Mesh.prototype.raycast = acceleratedRaycast;
BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

// Returns the max tree depth of the BVH
function getMaxDepth( bvh ) {

	return getBVHExtremes( bvh )[ 0 ].depth.max;

}

describe( 'Bounds Tree', () => {

	it( 'should properly encapsulate all triangles and bounds.', () => {

		const geom = new SphereBufferGeometry( 500, 50, 50 );
		const bvh = new MeshBVH( geom, { lazyGeneration: false } );
		const debug = new MeshBVHDebug( bvh, geom );

		expect( debug.validateBounds() ).toBeTruthy();

	} );

	it( 'should be generated when calling BufferGeometry.computeBoundsTree', () => {

		const geom = new SphereBufferGeometry( 1, 1, 1 );
		expect( geom.boundsTree ).not.toBeDefined();

		geom.computeBoundsTree();
		expect( geom.boundsTree ).toBeDefined();

	} );

	it( 'should throw an error if InterleavedBufferAttributes are used', () => {

		const indexAttr = new InterleavedBufferAttribute( new InterleavedBuffer( new Uint32Array( [ 1, 2, 3 ] ), 1 ), 4, 0, false );
		const posAttr = new InterleavedBufferAttribute( new InterleavedBuffer( new Float32Array( [ 1, 2, 3 ] ), 3 ), 4, 0, false );

		let geometry;
		let posErrorThrown = false;
		let indexErrorThrown = false;

		geometry = new BoxBufferGeometry();
		geometry.setAttribute( 'position', posAttr );
		try {

			new MeshBVH( geometry, { verbose: false } );

		} catch ( e ) {

			posErrorThrown = true;

		}

		expect( posErrorThrown ).toBe( true );

		geometry = new BoxBufferGeometry();
		geometry.setIndex( indexAttr );
		try {

			new MeshBVH( geometry, { verbose: false } );

		} catch ( e ) {

			indexErrorThrown = true;

		}

		expect( indexErrorThrown ).toBe( true );

	} );

	it( 'should use the boundsTree when raycasting if available', () => {

		const geom = new SphereBufferGeometry( 1, 1, 1 );
		const mesh = new Mesh( geom, new MeshBasicMaterial() );
		const raycaster = new Raycaster();

		raycaster.ray.origin.set( 0, 0, 10 );
		raycaster.ray.direction.set( 0, 0, - 1 );

		let calledRaycast = false;
		let calledRaycastFirst = false;
		geom.boundsTree = {

			raycast: () => calledRaycast = true,
			raycastFirst: () => calledRaycastFirst = true

		};

		mesh.raycast( raycaster, [] );
		expect( calledRaycast ).toBeTruthy();

		raycaster.firstHitOnly = true;
		mesh.raycast( raycaster, [] );
		expect( calledRaycastFirst ).toBeTruthy();

	} );

	it( 'should respect index group invariants', () => {

		const geo = new TorusBufferGeometry( 5, 5, 400, 100 );
		const groupCount = 10;
		const groupSize = geo.index.array.length / groupCount;

		for ( let g = 0; g < groupCount; g ++ ) {

			const groupStart = g * groupSize;
			geo.addGroup( groupStart, groupSize, 0 );

		}

		const indicesByGroup = () => {

			const result = {};

			for ( let g = 0; g < geo.groups.length; g ++ ) {

				result[ g ] = new Set();
				const { start, count } = geo.groups[ g ];
				for ( let i = start; i < start + count; i ++ ) {

					result[ g ].add( geo.index.array[ i ] );

				}

			}

			return result;

		};

		const before = indicesByGroup();
		geo.computeBoundsTree();
		const after = indicesByGroup();

		for ( let g in before ) {

			expect( before[ g ] ).toEqual( after[ g ] );

		}

	} );

	it( 'should create a correctly sized and typed index if one does not exist', () => {

		const geom = new BufferGeometry();
		const smallPosAttr = new BufferAttribute( new Float32Array( 3 * Math.pow( 2, 16 ) - 3 ), 3, false );
		const largePosAttr = new BufferAttribute( new Float32Array( 3 * Math.pow( 2, 16 ) + 3 ), 3, false );

		geom.setAttribute( 'position', smallPosAttr );

		expect( geom.index ).toBe( null );
		new MeshBVH( geom );
		expect( geom.index ).not.toBe( null );
		expect( geom.index.count ).toBe( smallPosAttr.count );
		expect( geom.index.array.BYTES_PER_ELEMENT ).toBe( 2 );

		geom.index = null;
		geom.setAttribute( 'position', largePosAttr );
		new MeshBVH( geom );
		expect( geom.index ).not.toBe( null );
		expect( geom.index.count ).toBe( largePosAttr.count );
		expect( geom.index.array.BYTES_PER_ELEMENT ).toBe( 4 );

	} );

} );

describe( 'Serialization', () => {

	it( 'should serialize then deserialize to the same structure.', () => {

		const geom = new SphereBufferGeometry( 1, 10, 10 );
		const bvh = new MeshBVH( geom, { packData: true, lazyGeneration: false } );
		const serialized = MeshBVH.serialize( bvh, geom );

		const deserializedBVH = MeshBVH.deserialize( serialized, geom );
		expect( deserializedBVH ).toEqual( bvh );

	} );

	it( 'should copy the index buffer from the target geometry unless copyIndex is set to false', () => {

		const geom = new SphereBufferGeometry( 1, 10, 10 );
		const bvh = new MeshBVH( geom, { packData: true, lazyGeneration: false } );

		expect( geom.index.array ).not.toBe( MeshBVH.serialize( bvh, geom ).index );
		expect( geom.index.array ).toBe( MeshBVH.serialize( bvh, geom, false ).index );

	} );

	it( 'should copy the index buffer onto the target geometry unless setIndex is set to false.', () => {

		const geom1 = new SphereBufferGeometry( 1, 10, 10 );
		const geom2 = new SphereBufferGeometry( 1, 10, 10 );
		const bvh = new MeshBVH( geom1, { packData: true, lazyGeneration: false } );
		const serialized = MeshBVH.serialize( bvh, geom1 );

		expect( geom2.index.array ).not.toBe( serialized.index );
		expect( geom2.index.array ).not.toEqual( serialized.index );
		MeshBVH.deserialize( serialized, geom2, false );

		expect( geom2.index.array ).not.toBe( serialized.index );
		expect( geom2.index.array ).not.toEqual( serialized.index );
		MeshBVH.deserialize( serialized, geom2, true );

		expect( geom2.index.array ).not.toBe( serialized.index );
		expect( geom2.index.array ).toEqual( serialized.index );

	} );

	it( 'should complete the tree and then deserialize to packed buffer data if original tree is lazily constructed.', () => {

		const geom = new SphereBufferGeometry( 1, 10, 10 );
		const bvh = new MeshBVH( geom, { packData: false, lazyGeneration: true } );

		expect( getMaxDepth( bvh ) ).toBe( 0 );

		const serialized = MeshBVH.serialize( bvh, geom );

		expect( getMaxDepth( bvh ) ).toBeGreaterThan( 0 );

		const deserializedBVH = MeshBVH.deserialize( serialized, geom );
		expect( deserializedBVH._isPacked ).toBeTruthy();
		expect( deserializedBVH._roots[ 0 ] instanceof ArrayBuffer ).toBeTruthy();

	} );

	it( 'should create a new index if one does not exist when deserializing', () => {

		const geom = new SphereBufferGeometry( 1, 10, 10 );
		const bvh = new MeshBVH( geom );
		const serialized = MeshBVH.serialize( bvh, geom );

		geom.index = null;

		MeshBVH.deserialize( serialized, geom );

		expect( geom.index ).toBeTruthy();

	} );

} );

describe( 'Options', () => {

	let mesh = null;
	beforeAll( () => {

		const geometry = new TorusBufferGeometry( 5, 5, 400, 100 );
		mesh = new Mesh( geometry, new MeshBasicMaterial() );

	} );

	describe( 'maxDepth', () => {

		it( 'should not be limited by default', () => {

			mesh.geometry.computeBoundsTree( { lazyGeneration: false } );

			const depth = getMaxDepth( mesh.geometry.boundsTree );
			expect( depth ).toBeGreaterThan( 10 );

		} );

		it( 'should cap the depth of the bounds tree', () => {

			mesh.geometry.computeBoundsTree( { maxDepth: 10, verbose: false, lazyGeneration: false } );

			const depth = getMaxDepth( mesh.geometry.boundsTree );
			expect( depth ).toEqual( 10 );

		} );

		it( 'successfully raycast', () => {

			const raycaster = new Raycaster();
			raycaster.ray.origin.set( 0, 0, 10 );
			raycaster.ray.direction.set( 0, 0, - 1 );

			const bvh = new MeshBVH( mesh.geometry, { maxDepth: 3, verbose: false } );
			const ogHits = raycaster.intersectObject( mesh, true );

			mesh.geometry.boundsTree = bvh;
			const bvhHits = raycaster.intersectObject( mesh, true );

			raycaster.raycastFirst = true;
			const firstHit = raycaster.intersectObject( mesh, true );

			expect( ogHits ).toEqual( bvhHits );
			expect( firstHit[ 0 ] ).toEqual( ogHits[ 0 ] );

		} );

	} );

	describe( 'packData & lazyGeneration', () => {

		it( 'should be constructed to array buffers if packData is true and lazyGeneration is false.', () => {

			mesh.geometry.computeBoundsTree( { packData: true, lazyGeneration: false } );

			const bvh = mesh.geometry.boundsTree;
			expect( bvh._isPacked ).toBeTruthy();
			expect( bvh._roots[ 0 ] instanceof ArrayBuffer ).toBeTruthy();
			expect( getMaxDepth( bvh ) ).toBeGreaterThan( 0 );

		} );

		it( 'should be fully constructed as nodes if packData and lazyGeneration are false.', () => {

			mesh.geometry.computeBoundsTree( { packData: false, lazyGeneration: false } );

			const bvh = mesh.geometry.boundsTree;
			expect( bvh._isPacked ).toBeFalsy();
			expect( bvh._roots[ 0 ] instanceof ArrayBuffer ).toBeFalsy();
			expect( getMaxDepth( bvh ) ).toBeGreaterThan( 0 );

		} );

		it( 'should be partially constructed as nodes if packData is false and lazyGeneration is true.', () => {

			mesh.geometry.computeBoundsTree( { packData: false, lazyGeneration: true } );

			const bvh = mesh.geometry.boundsTree;
			expect( bvh._isPacked ).toBeFalsy();
			expect( bvh._roots[ 0 ] instanceof ArrayBuffer ).toBeFalsy();
			expect( getMaxDepth( bvh ) ).toBe( 0 );

		} );

	} );

	describe( 'strategy', () => {

		it.todo( 'should set the split strategy' );

	} );

	afterEach( () => {

		mesh.geometry.boundsTree = null;

	} );

} );

describe( 'BoundsTree API', () => {

	it.todo( 'test bounds tree and node apis directly' );

} );
