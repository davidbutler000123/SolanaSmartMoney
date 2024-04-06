
export const logTimeString = () => {
    let nowTime = new Date
    return nowTime.toLocaleDateString() + ' ' + nowTime.toLocaleTimeString()
}

export const fmtTimestr = (unixTime) => {
    let timeVal = new Date(unixTime)
    return timeVal.toLocaleDateString() + ' ' + timeVal.toLocaleTimeString()
}