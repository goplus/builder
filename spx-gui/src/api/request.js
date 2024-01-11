import axios from 'axios';

/**
 * @description Basic ajax request method
 *
 * @param method Request method, "POST" / "GET"
 * @param url    Request URL
 * @param dataOrParams  Request parameters/body
 * @param headers   Request headers
 * @returns {Promise<any>}
 *
 * @author yxy
 * @createDate 2024.1.10
 */
export async function request(method, url, dataOrParams = null,headers={} ) {
    const base_url = "http://localhost:xxxx" + url;
    try {
        const defaultHeaders = {
            "Content-Type": "application/json",
        };

        const mergedHeaders = {
            ...defaultHeaders,
            ...headers,
        };

        const response = await axios({
            method,
            url: base_url,
            data: method.toLowerCase() === "get" ? null : dataOrParams,
            params: method.toLowerCase() === "get" ? dataOrParams : null,
            headers: mergedHeaders,
        });
        console.log(`[request] ${base_url} |request successful，response:`);
        console.log(response)
        return response.data;
    } catch (error) {
        console.log(`[request] ${base_url} |request failed, dataOrParams: ${JSON.stringify(dataOrParams)}`);
        console.log(error);
        throw error;
    }
}
