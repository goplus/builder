precision mediump float;
uniform sampler2D uTexture;

varying vec2 vUV;

void main() {
    gl_FragColor = texture2D(uTexture, vec2(vUV.x, 1.0 - vUV.y));
}