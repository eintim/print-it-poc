import * as THREE from "three";

/**
 * Triangle count and closed-mesh volume in model units³ (same space as Box3 from the asset).
 * Volume uses the signed tetrahedron sum; |sum| for non-watertight meshes is a rough proxy.
 */
export function computeMeshPrintStats(root: THREE.Object3D): {
  triangleCount: number;
  solidVolumeModelUnits3: number;
} {
  let triangleCount = 0;
  let signedVolume = 0;

  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const e1 = new THREE.Vector3();
  const e2 = new THREE.Vector3();
  const cross = new THREE.Vector3();

  root.updateWorldMatrix(true, true);

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) {
      return;
    }

    const geometry = mesh.geometry as THREE.BufferGeometry;
    const position = geometry.getAttribute("position");
    if (!position) {
      return;
    }

    mesh.updateWorldMatrix(true, false);
    const matrix = mesh.matrixWorld;

    const addTriangle = (i0: number, i1: number, i2: number) => {
      v0.fromBufferAttribute(position, i0).applyMatrix4(matrix);
      v1.fromBufferAttribute(position, i1).applyMatrix4(matrix);
      v2.fromBufferAttribute(position, i2).applyMatrix4(matrix);
      e1.subVectors(v1, v0);
      e2.subVectors(v2, v0);
      cross.crossVectors(e1, e2);
      signedVolume += v0.dot(cross) / 6;
      triangleCount += 1;
    };

    const index = geometry.getIndex();
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        addTriangle(index.getX(i), index.getX(i + 1), index.getX(i + 2));
      }
    } else {
      for (let i = 0; i < position.count; i += 3) {
        addTriangle(i, i + 1, i + 2);
      }
    }
  });

  return {
    triangleCount,
    solidVolumeModelUnits3: Math.abs(signedVolume),
  };
}
