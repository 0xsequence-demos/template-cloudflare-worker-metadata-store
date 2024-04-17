import { ethers } from 'ethers'

export interface Env {
	PROJECT_ID: number;
	COLLECTION_ID: number;
	PROJECT_ACCESS_KEY: string;
	JWT_ACCESS_KEY: string;
	IMAGE_URL_TO_STORE: string;
}

const uploadAsset = async (env: Env, projectID: any, collectionID: any, assetID: any, tokenID: any, url: any) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch file from ${url}: ${response.statusText}`);
    const arrayBuffer = await response.arrayBuffer();
    const blob = new Blob([arrayBuffer]);

    const formData = new FormData();
    
    formData.append('file', blob, `image.png`); // You might want to dynamically determine the filename
    
    let METADATA_URL = 'https://metadata.sequence.app'

    // Construct the endpoint URL
    const endpointURL = `${METADATA_URL}/projects/${projectID}/collections/${collectionID}/tokens/${tokenID}/upload/${assetID}`;

    try {
        // Use fetch to make the request
        const fetchResponse = await fetch(endpointURL, {
        method: 'PUT',
        body: formData as any,
        headers: {
            'X-Access-Key': env.PROJECT_ACCESS_KEY,
            'Authorization': `Bearer ${env.JWT_ACCESS_KEY}`, // Put your token here
        } as any,
        });
    
        // Assuming the response is JSON
        const data = await fetchResponse.json();
		console.log(data)
        return data;
    }catch(err){
        console.log(err)
    }
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const projectID = Number(env.PROJECT_ID)
		const collectionID = Number(env.COLLECTION_ID)
		
		const METADATA_URL = 'https://metadata.sequence.app'
		const myHeaders: any = new Headers();
		myHeaders.append("Content-Type", "application/json");
		myHeaders.append("Authorization", `Bearer ${env.JWT_ACCESS_KEY}`);
		
		const randomTokenIDSpace = ethers.BigNumber.from(ethers.utils.hexlify(ethers.utils.randomBytes(20)))
		
		// Metadata: Create Token
		const stringBody = JSON.stringify({
			"projectID": projectID,
			"collectionID": collectionID,
			"token": {
				"tokenId": String(randomTokenIDSpace),
				"name": "Clouds",
				"description": "Clouds store",
				"decimals": 0,
				"attributes": []
			}
		});
		
		const requestOptions = {
			method: "POST",
			headers: myHeaders,
			body: stringBody,
		};
		
		const res = await fetch(`${METADATA_URL}/rpc/Collections/CreateToken`, requestOptions)

		console.log('Created a token')
		console.log(await res.json())

		// Metadata: Create Asset
		const stringBody2 = JSON.stringify({
			"projectID": projectID,
			"asset": {
				"collectionId": collectionID,
				"tokenId": String(randomTokenIDSpace),
				"metadataField": "image"
			}
		});

		const requestOptions2 = {
			method: "POST",
			headers: myHeaders,
			body: stringBody2,
		};

		const res2 = await fetch(`${METADATA_URL}/rpc/Collections/CreateAsset`, requestOptions2)
		const json2: any = await res2.json()

		console.log('Created an asset')
		console.log(json2)

		// Metadata: Upload Asset
		const imageUrl = env.IMAGE_URL_TO_STORE
		const uploadAssetRes: any = await uploadAsset(env, projectID, collectionID, json2.asset.id, String(randomTokenIDSpace), imageUrl)

		// Metadata: Update Non-private Token
		const stringBody3 = JSON.stringify({
			"projectID": projectID,
			"collectionID": collectionID,
			"private": false,
			"tokenID": String(randomTokenIDSpace)
		});
		
		const requestOptions3 = {
			method: "POST",
			headers: myHeaders,
			body: stringBody3,
		};
		
		const res3 = await fetch(`${METADATA_URL}/rpc/Collections/UpdateToken`, requestOptions3)
		console.log('Updated to non-private')

		return new Response(JSON.stringify({response: await res3.json(), url: uploadAssetRes.url}), {status: 200});
	},
};
