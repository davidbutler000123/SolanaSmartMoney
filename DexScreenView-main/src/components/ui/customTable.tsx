import React, { useEffect, useRef, useState } from 'react';
import Pagination from './pagination';
import Vectorearth from '@/assets/Vectorearth.svg';
import Vectortelegram from '@/assets/Vectortelegram.svg';
import Vectortwitter from '@/assets/Vectortwitter.svg';
import Vectorsol from '@/assets/Vectorsol.svg';
import Vectorclock from '@/assets/Vectorclock.svg';
import Vectordex from '@/assets/Vectordex.svg';
import Vectorcheck from '@/assets/Vectorcheck.svg';
import VectorUncheck from '@/assets/VectorUncheck.svg';
import CopyToClipboard from '@/components/ui/snippet';
import { Button } from '@/components/ui/button';
import {
	AlertItem,
	TableProps,
	convertTime,
	divideAndRound,
	getTimeFormat,
	roundToFourDecimals,
} from '../utils';
import axios from 'axios';
import PaginationCustom from './paginationCustom';

const ITEMS_PER_PAGE = 1;

const serverUrl = 'http://95.217.146.177:5000';
// const serverUrl = 'https://95.217.146.177:5000';

const TableComponent: React.FC<TableProps> = ({ updateType }) => {
	const [currentPage, setCurrentPage] = useState<number>(1);
	const totalPageRef = useRef(0);
	const currentPageref = useRef(1);
	const currentTyperef = useRef('0');
	const [currentItems, setCurrentItems] = useState<AlertItem[]>([]);

	useEffect(() => {
		const intervalId = setInterval(getServerData, 1000);

		return () => clearInterval(intervalId);
	}, []);

	useEffect(() => {
		console.log('update', '11');
		let curType = '0';
		if (updateType === 'alert1') curType = '0';
		else curType = '1';
		currentTyperef.current = curType;
		totalPageRef.current = 0;
		let curPage = 1;
		let curTypeItem = localStorage.getItem(curType);
		if (curTypeItem !== null) {
			curPage = parseInt(curTypeItem);
		}
		console.log('curPage--', curPage);
		currentPageref.current = curPage;
		setCurrentPage(curPage);
		getServerData();
	}, [updateType]);

	const handlePageChange = (page: number) => {
		setCurrentPage(page);
		localStorage.setItem(currentTyperef.current, page.toString());
		currentPageref.current = page;
		getServerData();
	};

	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;

	const getServerData = () => {
		const params = {
			offset: currentPageref.current - 1,
			limit: ITEMS_PER_PAGE,
			type: currentTyperef.current,
		};
		console.log('params----------------', params);

		axios
			.get(`${serverUrl}/api/tokenAlerts`, { params })
			.then((response) => {
				console.log('getServerData-', response);
				let round = 0;
				// if (response.data.total % ITEMS_PER_PAGE !== 0) round = 1;
				totalPageRef.current = Math.ceil(
					parseInt(response.data.total) / ITEMS_PER_PAGE
				);
				console.log('total Page-', totalPageRef.current);
				const alerts = response.data.alerts.map((item: any) => {
					return {
						id: '1',
						logoUrl: item.logoURI,
						pairInfo: [item.symbol, item.name],
						pairs: item.address,
						signal:
							convertTime(item.poolCreated) +
							'/' +
							getTimeFormat(item.pairLifeTimeMins),
						audit: [item.mintDisabled, item.lpBurned, item.top10],
						initialLP: [
							roundToFourDecimals(item.initLiquiditySol),
							divideAndRound(item.initLiquidityUsd),
						],
						fdvSignal: [
							roundToFourDecimals(item.fdvSol),
							divideAndRound(item.fdvUsd),
						],
						fdvAth: [
							roundToFourDecimals(item.fdvAthSol),
							divideAndRound(item.fdvAthUsd),
						],
						fdvNow: [
							roundToFourDecimals(item.fdvNowSol),
							divideAndRound(item.fdvNowUsd),
						],
						roiAth: item.roiAth + '%',
						roiNow: item.roiNow + '%',
						social: [
							item.webSiteUrl,
							item.telegramUrl,
							item.twitterUrl,
							item.dexUrl,
						],
					};
				});
				setCurrentItems(alerts);
			})
			.catch((error) => {
				console.log('getServerData-', error);
			});
	};

	return (
		<div className='w-full  bg-white dark:bg-black '>
			<div className='overflow-x-auto'>
				<table className='w-full divide-y divide-[#4C4C4C] whitespace-nowrap'>
					<thead className='bg-white bg-opacity-10'>
						<tr className='text-xs font-medium '>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								PAIR INFO
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								PAIRS
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								SIGNAL/AFTER OPEN
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								AUDIT
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								INITAL LP
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								FDV (SIGNAL)
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								FDV(ATH)
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								FDV(NOW)
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								ROI(ATH)
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								ROI (NOW)
							</th>
							<th className='px-6 py-3 text-left text-xs font-medium text-black dark:text-white uppercase tracking-wider'>
								SOCIAL
							</th>
						</tr>
					</thead>
					<tbody className='bg-white dark:bg-black divide-y text-white divide-[#4C4C4C]'>
						{currentItems.map((item, index) => (
							<tr key={index} className='text-black dark:text-white'>
								<td className='pl-4 pr-12 py-4 '>
									<div className='flex flex-row gap-2'>
										<img
											src={item.logoUrl}
											width={40}
											height={40}
											alt='Token Avatar'
										/>
										<div className='flex flex-col gap-1'>
											<span className='text-[13px] leading-4 font-bold'>
												{item.pairInfo[0]}
											</span>
											<span className='text-[10px] leading-3 whitespace-nowrap'>
												{item.pairInfo[1]}
											</span>
										</div>
									</div>
								</td>
								<td className='px-2 py-4 '>
									<div className='flex justify-center items-center'>
										<CopyToClipboard snippetText={item.pairs} />
									</div>
								</td>
								<td className='px-6 py-4 '>
									<div className='flex flex-row font-medium text-[12px] leading-4 items-center gap-2 whitespace-nowrap'>
										<Vectorclock fill='white' width={11} height={11} />
										<span>{item.signal}</span>
									</div>
								</td>
								<td className='px-6 py-4 '>
									<div className='flex flex-row text-xs gap-3'>
										<div className='flex flex-col items-center  gap-2'>
											{item.audit[0] === true ? (
												<Vectorcheck fill='white' width={14} height={14} />
											) : (
												<VectorUncheck fill='white' width={14} height={14} />
											)}
											<span className='whitespace-pre-wrap  text-center'>
												Mint Disabled
											</span>
										</div>
										<div className='flex flex-col items-center  gap-2'>
											{item.audit[1] === true ? (
												<Vectorcheck fill='white' width={14} height={14} />
											) : (
												<VectorUncheck fill='white' width={14} height={14} />
											)}
											<span className='whitespace-pre-wrap text-center'>
												LP Burned
											</span>
										</div>
										<div className='flex flex-col items-center gap-2'>
											{item.audit[2] === true ? (
												<Vectorcheck fill='white' width={14} height={14} />
											) : (
												<VectorUncheck fill='white' width={14} height={14} />
											)}
											<span className='whitespace-pre-wrap text-center'>
												Top 10-20%
											</span>
										</div>
									</div>
								</td>
								<td className='px-6 py-4 '>
									<div className='flex flex-row gap-2 items-center'>
										<Vectorsol fill='white' width={12} height={12} />
										<div className='flex flex-col text-[13px] leading-[18.85px] '>
											<span className='font-bold'>{item.initialLP[0]}</span>
											<span className='opacity-80'>{item.initialLP[1]}</span>
										</div>
									</div>
								</td>
								<td className='px-6 py-4 '>
									<div className='flex flex-row gap-2 items-center'>
										<Vectorsol fill='white' width={12} height={12} />
										<div className='flex flex-col text-[13px] leading-[18.85px] '>
											<span className='font-bold'>{item.fdvSignal[0]}</span>
											<span className='opacity-80'>{item.fdvSignal[1]}</span>
										</div>
									</div>
								</td>
								<td className='px-6 py-4 '>
									<div className='flex flex-row gap-2 items-center'>
										<Vectorsol fill='white' width={12} height={12} />
										<div className='flex flex-col text-[13px] leading-[18.85px] '>
											<span className='font-bold'>{item.fdvAth[0]}</span>
											<span className='opacity-80'>{item.fdvAth[1]}</span>
										</div>
									</div>
								</td>
								<td className='px-6 py-4 '>
									<div className='flex flex-row gap-2 items-center'>
										<Vectorsol fill='white' width={12} height={12} />
										<div className='flex flex-col text-[13px] leading-[18.85px] '>
											<span className='font-bold'>{item.fdvNow[0]}</span>
											<span className='opacity-80'>{item.fdvNow[1]}</span>
										</div>
									</div>
								</td>
								<td className='px-6 py-4 text-[#27AD75] font-bold text-[13px] leading-[18.85px]'>
									{item.roiAth}x{' '}
								</td>
								<td className='px-6 py-4 text-[#27AD75] font-bold text-[13px] leading-[18.85px]'>
									{item.roiNow}x{' '}
								</td>
								<td className='px-6 py-4 '>
									<div className='flex flex-row gap-3'>
										{item.social[0] !== '' ? (
											<a href={item.social[2]}>
												<Vectorearth
													fill='currentColor'
													className='text-black dark:text-white'
													width={14}
													height={14}
												/>
											</a>
										) : (
											<></>
										)}
										{item.social[2] !== '' ? (
											<a href={item.social[1]}>
												<Vectortelegram
													fill='currentColor'
													className='text-black dark:text-white'
													width={14}
													height={14}
												/>
											</a>
										) : (
											<></>
										)}
										{item.social[2] !== '' ? (
											<a href={item.social[2]}>
												<Vectortwitter
													fill='currentColor'
													className='text-black dark:text-white'
													width={14}
													height={14}
												/>
											</a>
										) : (
											<></>
										)}

										{item.social[2] !== '' ? (
											<a href={item.social[3]}>
												<Vectordex
													fill='currentColor'
													className='text-black dark:text-white'
													width={14}
													height={14}
												/>
											</a>
										) : (
											<></>
										)}
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div>
				<PaginationCustom
					currentPage={currentPage}
					totalPages={totalPageRef.current}
					onPageChange={handlePageChange}
				/>
			</div>
		</div>
	);
};

export default TableComponent;
1;
