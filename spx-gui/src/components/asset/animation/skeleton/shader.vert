uniform mat4 uProjectionMatrix;
uniform mat4 uWorldTransformMatrix;
uniform mat4 uTransformMatrix;

attribute vec4 position;
attribute vec2 aUV;

varying vec2 vUV;

void main() {
    mat4 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = mvp * position;
    vUV = aUV;
}