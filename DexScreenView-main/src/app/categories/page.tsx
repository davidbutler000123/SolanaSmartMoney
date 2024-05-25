'use client';

import PlaceholderContent from '@/components/demo/placeholder-content';
import { ContentLayout } from '@/components/admin-panel/content-layout';
import React from 'react';
import TableComponentSmart from '@/components/ui/customTableSmart';
import { SmartItem } from '@/components/utils';

export default function SmartPage() {
	const [activeTab, setActiveTab] = React.useState<string>('Individual');

	return (
		<ContentLayout title='Smart'>
			<div className='w-full flex flex-row  bg-white dark:bg-[#0A0A0D] border-b-2 border-solid border-gray-200 dark:border-[#4C4C4C]  pt-2'>
				<span
					onClick={() => setActiveTab('Individual')}
					className={`text-[14px] ${
						activeTab === 'Individual'
							? 'text-black dark:text-white border-b-4 border-black dark:border-white'
							: 'border-transparent text-[#8A919E]'
					} cursor-pointer pt-2 px-6 outline-none hover:text-dark dark:hover:text-white border-b-4  hover:border-black dark:hover:border-white text-lg py-3`}>
					Individual
				</span>
				<span
					onClick={() => setActiveTab('Group')}
					className={`text-[14px] ${
						activeTab === 'Group'
							? 'text-black dark:text-white border-b-4 border-black dark:border-white'
							: 'border-transparent text-[#8A919E]'
					} cursor-pointer pt-2 px-6 outline-none hover:text-dark dark:hover:text-white border-b-4  hover:border-black dark:hover:border-white text-lg py-3`}>
					Group
				</span>
			</div>
			<div className='flex flex-col'>
				<TableComponentSmart updateType={activeTab} />
			</div>
			<PlaceholderContent />
		</ContentLayout>
	);
}
