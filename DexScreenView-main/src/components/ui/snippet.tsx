'use client';
import React, { useState, useRef } from 'react';

// Image imports
import CopyClipboardImage from '@/assets/copy.svg';
import PasteClipboardImage from '@/assets/paste.svg';

interface CopyToClipboardProps {
	snippetText: string;
}

const CopyToClipboard: React.FC<CopyToClipboardProps> = ({ snippetText }) => {
	const [copyState, setCopyState] = useState<string>('copy');
	const inputRef = useRef<HTMLInputElement>(null);

	const copyToClipboard = () => {
		if (inputRef.current) {
			// Copy text to clipboard
			navigator.clipboard.writeText(inputRef.current.value).then(() => {
				// Change button image
				setCopyState('paste');

				// Revert back to original image after 1 second
				setTimeout(() => {
					setCopyState('copy');
				}, 1000);
			});
		}
	};

	const showEdgeChars = (inputString: string): string => {
		if (inputString === '' || inputString === undefined) return '';
		if (inputString.length < 8) {
			// If the string is too short, return it as is or handle as needed
			return inputString;
		}

		const firstFour = inputString.slice(0, 5);
		const lastFour = inputString.slice(-5);
		return `${firstFour}...${lastFour}`;
	};

	return (
		<div
			className='bg-white dark:bg-black text-xs font-medium'
			style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
			<input
				type='text'
				className='bg-white dark:bg-black w-28'
				value={showEdgeChars(snippetText)}
				readOnly
			/>
			<input
				ref={inputRef}
				type='text'
				className='bg-white dark:bg-black hidden'
				value={snippetText}
				readOnly
			/>
			<button
				onClick={copyToClipboard}
				style={{
					border: 'none',
					background: 'none',
					position: 'absolute',
					right: '10px',
					cursor: 'pointer',
					height: '100%',
					display: 'flex',
					alignItems: 'center',
				}}>
				{copyState === 'copy' ? (
					<CopyClipboardImage width={12} height={12} />
				) : (
					<PasteClipboardImage width={12} height={12} />
				)}
			</button>
		</div>
	);
};

export default CopyToClipboard;
