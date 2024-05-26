export interface AlertItem {
	logoUrl: string;
	pairInfo: string[];
	pairs: string;
	signal: string;
	audit: boolean[];
	initialLP: string[];
	fdvSignal: string[];
	fdvAth: string[];
	fdvNow: string[];
	roiAth: string;
	roiNow: string;
	social: string[];
}

export interface SmartItem {
	logoUrl: string;
	pairInfo: string[];
	pairs: string;
	wallet: { type: boolean; value: string };
	signal: string[];
	audit: boolean[];
	initialLP: string[];
	fdvSignal: string[];
	fdvAth: string[];
	fdvNow: string[];
	roiAth: string;
	roiNow: string;
	social: string[];
}

export const convertTime = (timestamp: number): string => {
	if (timestamp === 0) return '';
	const date = new Date(timestamp);
	const formattedDate = `${date.getFullYear()}-${String(
		date.getMonth() + 1
	).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(
		date.getHours()
	).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(
		date.getSeconds()
	).padStart(2, '0')}`;
	return formattedDate;
};

export const divideAndRound = (divisor: string): string => {
	// console.log('smart--divi', divisor);
	if (divisor === '' || divisor === undefined) return '0';
	const numericDivisor = parseFloat(divisor);
	if (isNaN(numericDivisor) || numericDivisor === 0) {
		return '0';
	}

	const result = numericDivisor / 1000;
	return parseFloat(result.toFixed(2)) + 'K';
};

export const roundToFourDecimals = (num: number): number => {
	if (num === undefined || num === 0) return 0;
	return parseFloat(num.toFixed(2));
};

export type TableProps = {
	updateType: string;
};

export const getTimeFormat = (timeStr: string): string => {
	return timeStr;
	console.log(timeStr);
	if (timeStr === '' || timeStr === undefined) return '';
	const time = parseInt(timeStr);
	const hr = Math.floor(time / 60);
	const min = time % 60;
	return hr + 'h' + ' ' + min + 'm';
};
