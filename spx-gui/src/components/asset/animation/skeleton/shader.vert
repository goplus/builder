uniform vec2 uResolution;
uniform vec2 uScale;
uniform float uFlipY;
uniform vec2 uTranslate;

attribute vec4 position;
attribute vec2 aUV;

varying vec2 vUV;

void main() {
    vec2 zeroToOne = position.xy * uScale / uResolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    clipSpace += uTranslate;
    gl_Position = vec4(clipSpace * vec2(1, uFlipY), 0, 1);

    vUV = aUV;
}