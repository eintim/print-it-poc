import { NextResponse } from "next/server";

function createMockGeometry() {
  const positions = new Float32Array([
    0, 1, 0,
    -1, -1, 1,
    1, -1, 1,
    0, -1, -1,
  ]);

  const normals = new Float32Array([
    0, 1, 0,
    -0.577, -0.577, 0.577,
    0.577, -0.577, 0.577,
    0, -0.707, -0.707,
  ]);

  const indices = new Uint16Array([
    0, 1, 2,
    0, 2, 3,
    0, 3, 1,
    1, 3, 2,
  ]);

  return { positions, normals, indices };
}

function buildMockGltf() {
  const { positions, normals, indices } = createMockGeometry();
  const totalByteLength = positions.byteLength + normals.byteLength + indices.byteLength;
  const combined = new Uint8Array(totalByteLength);

  combined.set(new Uint8Array(positions.buffer), 0);
  combined.set(new Uint8Array(normals.buffer), positions.byteLength);
  combined.set(
    new Uint8Array(indices.buffer),
    positions.byteLength + normals.byteLength,
  );

  const document = {
    asset: { version: "2.0" },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [
      {
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 1,
            },
            indices: 2,
            material: 0,
          },
        ],
      },
    ],
    materials: [
      {
        pbrMetallicRoughness: {
          baseColorFactor: [0.18, 0.85, 0.92, 1],
          metallicFactor: 0.05,
          roughnessFactor: 0.42,
        },
      },
    ],
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: 4,
        type: "VEC3",
        min: [-1, -1, -1],
        max: [1, 1, 1],
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: 4,
        type: "VEC3",
      },
      {
        bufferView: 2,
        componentType: 5123,
        count: 12,
        type: "SCALAR",
      },
    ],
    bufferViews: [
      {
        buffer: 0,
        byteOffset: 0,
        byteLength: positions.byteLength,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: positions.byteLength,
        byteLength: normals.byteLength,
        target: 34962,
      },
      {
        buffer: 0,
        byteOffset: positions.byteLength + normals.byteLength,
        byteLength: indices.byteLength,
        target: 34963,
      },
    ],
    buffers: [
      {
        byteLength: totalByteLength,
        uri: `data:application/octet-stream;base64,${Buffer.from(combined).toString("base64")}`,
      },
    ],
  };

  return JSON.stringify(document);
}

function buildMockStl(taskId: string) {
  return `solid ${taskId}
facet normal 0 0 1
  outer loop
    vertex 0 1 0
    vertex -1 -1 1
    vertex 1 -1 1
  endloop
endfacet
facet normal 1 0 0
  outer loop
    vertex 0 1 0
    vertex 1 -1 1
    vertex 0 -1 -1
  endloop
endfacet
facet normal -1 0 0
  outer loop
    vertex 0 1 0
    vertex 0 -1 -1
    vertex -1 -1 1
  endloop
endfacet
facet normal 0 -1 0
  outer loop
    vertex -1 -1 1
    vertex 0 -1 -1
    vertex 1 -1 1
  endloop
endfacet
endsolid ${taskId}
`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ taskId: string; asset: string }> },
) {
  const { taskId, asset } = await context.params;

  if (!taskId.startsWith("mock-meshy-")) {
    return NextResponse.json({ error: "Unknown mock task." }, { status: 404 });
  }

  if (asset === "model.gltf") {
    return new NextResponse(buildMockGltf(), {
      headers: {
        "Content-Type": "model/gltf+json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  if (asset === "model.stl") {
    return new NextResponse(buildMockStl(taskId), {
      headers: {
        "Content-Type": "model/stl",
        "Content-Disposition": `attachment; filename="${taskId}.stl"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  }

  return NextResponse.json({ error: "Unknown mock asset." }, { status: 404 });
}
