import React from 'react';
import { Button } from './button';

interface PaginationProps {
	currentPage: number;
	totalPages: number;
	onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({
	currentPage,
	totalPages,
	onPageChange,
}) => {
	const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

	return (
		<div className='pagination w-full flex justify-center items-center bg-white dark:bg-black  '>
			<div className='flex flex-row gap-4 my-6 p-4 bg-white dark:bg-black'>
				<Button
					className={`text-white darK:text-black dark:text-black bg-black opacity-20  dark:bg-white  dark:opacity-70 ${
						currentPage === 1 ? 'bg-gray-600' : ''
					}`}
					disabled={currentPage === 1}
					onClick={() => onPageChange(currentPage - 1)}>
					&lt;&lt;
				</Button>
				{pages.map((page) => (
					<Button
						key={page}
						className={
							page === currentPage
								? 'active text-[#27AD75] bg-white opacity-70 '
								: 'bg-white opacity-70 text-black'
						}
						onClick={() => onPageChange(page)}>
						{page}
					</Button>
				))}
				<Button
					className={`text-white darK:text-black dark:text-black bg-black opacity-20  dark:bg-white  dark:opacity-70 ${
						currentPage === totalPages ? 'bg-gray-600' : ''
					}`}
					disabled={currentPage === totalPages}
					onClick={() => onPageChange(currentPage + 1)}>
					&gt;&gt;
				</Button>
			</div>
		</div>
	);
};

export default Pagination;
