'use client';

import PlaceholderContent from '@/components/demo/placeholder-content';
import { ContentLayout } from '@/components/admin-panel/content-layout';
import React from 'react';
import TableComponent from '@/components/ui/customTable';
import { AlertItem } from '@/components/utils';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
	const [activeTab, setActiveTab] = React.useState<string>('alert1');

	const setActive = (type: string) => {
		setActiveTab(type);
	};

	return (
		<ContentLayout title='Quant'>
			<div className='w-full flex flex-row items-center bg-white dark:bg-[#0A0A0D] border-b-2 border-solid border-gray-200 dark:border-[#4C4C4C] pt-2'>
				<span
					onClick={() => setActive('alert1')}
					className={`text-[14px] ${
						activeTab === 'alert1'
							? 'text-black dark:text-white border-b-4 border-black dark:border-white'
							: 'border-transparent text-[#8A919E]'
					} cursor-pointer pt-2 px-6 outline-none hover:text-dark dark:hover:text-white border-b-4 hover:border-black dark:hover:border-white text-lg py-3`}>
					Alert 01
				</span>
				<span
					onClick={() => setActive('alert2')}
					className={`text-[14px] ${
						activeTab === 'alert2'
							? 'text-black dark:text-white border-b-4 border-black dark:border-white'
							: 'border-transparent text-[#8A919E]'
					} cursor-pointer pt-2 px-6 outline-none hover:text-dark dark:hover:text-white border-b-4 hover:border-black dark:hover:border-white text-lg py-3`}>
					Alert 02
				</span>
				<div className='flex-grow'></div>
				<Button className='bg-gray-400'>Export Excel</Button>
			</div>

			<div className='flex flex-col'>
				{/* {activeTab === 'alert1' ? (
					<div className='flex flex-col'>
						<TableComponent type={'0'} />
					</div>
				) : (
					<div className='flex flex-col'>
						<TableComponent type={'1'} />
					</div>
				)} */}
				<TableComponent updateType={activeTab} />
			</div>
			{/* <PlaceholderContent /> */}
		</ContentLayout>
	);
}
