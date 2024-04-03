
export const logTimeString = () => {
    let nowTime = new Date
    return nowTime.toLocaleDateString() + ' ' + nowTime.toLocaleTimeString()
}