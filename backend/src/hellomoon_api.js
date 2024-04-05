
const axios = require("axios");

const url = "https://rest-api.hellomoon.io/v0/token/transfers";

async function getTransfers() {
    const { data } = await axios.post(
        url,
        {
			type: "transfer",
			//"sourceOwner": "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82"
            sourceOwner: "DSUvc5qf5LJHHV5e2tD184ixotSnCnwj7i4jJa4Xsrmt"
		},
        {
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: "Bearer 00f4178d-d782-4d0e-ac29-02706daa7be2",
            },
        }
    );

    console.log(data.data);
}

getTransfers()