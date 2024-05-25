import React from 'react';
import { Button } from './button';

interface PaginationCustomProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

const PaginationCustom: React.FC<PaginationCustomProps> = ({
	currentPage,
	totalPages,
	onPageChange,
}) => {
	const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
	const maxPageButtons = 5;
	const halfPageButtons = Math.floor(maxPageButtons / 2);
	let startPage = Math.max(currentPage - halfPageButtons, 1);
	let endPage = startPage + maxPageButtons - 1;

	if (endPage > totalPages) {
		endPage = totalPages;
		startPage = Math.max(endPage - maxPageButtons + 1, 1);
	}

	return (
		<div className='pagination my-10 w-full flex justify-center items-center bg-white dark:bg-black  gap-4'>
			<Button
				className={`text-white darK:text-black dark:text-black bg-black opacity-20  dark:bg-white  dark:opacity-70 ${
					currentPage === 1 ? 'bg-gray-600' : ''
				}`}
				onClick={() => onPageChange(1)}
				disabled={currentPage === 1}>
				&lt;&lt;
			</Button>
			<Button
				onClick={() => onPageChange(currentPage - 1)}
				disabled={currentPage === 1}>
				&lt;
			</Button>
			{pages.slice(startPage - 1, endPage).map((page) => (
				<Button
					key={page}
					className={page === currentPage ? 'active bg-red-500' : ''}
					onClick={() => onPageChange(page)}>
					{page}
				</Button>
			))}
			<Button
				className={`text-white darK:text-black dark:text-black bg-black opacity-20  dark:bg-white  dark:opacity-70 ${
					currentPage === totalPages ? 'bg-gray-600' : ''
				}`}
				onClick={() => onPageChange(currentPage + 1)}
				disabled={currentPage === totalPages}>
				&gt;
			</Button>
			<Button
				onClick={() => onPageChange(totalPages)}
				disabled={currentPage === totalPages}>
				&gt;&gt;
			</Button>
		</div>
	);
};

export default PaginationCustom;
