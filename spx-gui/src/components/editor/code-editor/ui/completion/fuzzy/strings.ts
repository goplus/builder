/**
 * A fast function (therefore imprecise) to check if code points are emojis.
 * Generated using https://github.com/alexdima/unicode-utils/blob/main/emoji-test.js
 */
export function isEmojiImprecise(x: number): boolean {
	return (
		(x >= 0x1F1E6 && x <= 0x1F1FF) || (x === 8986) || (x === 8987) || (x === 9200)
		|| (x === 9203) || (x >= 9728 && x <= 10175) || (x === 11088) || (x === 11093)
		|| (x >= 127744 && x <= 128591) || (x >= 128640 && x <= 128764)
		|| (x >= 128992 && x <= 129008) || (x >= 129280 && x <= 129535)
		|| (x >= 129648 && x <= 129782)
	);
}
