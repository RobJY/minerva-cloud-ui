/*
Configuration file for the Minerva admin client
*/

var AppConfig = {
    region: "us-east-1",
    // Url for the Minerva API Gateway (without stage) 
    minervaBaseUrl: "https://3v21j4dh1d.execute-api.us-east-1.amazonaws.com",
    // Stage name for the Minerva API Gateway (e.g. dev, test, prod)
    minervaStage: "dev",
    CognitoUserPoolId: "us-east-1_d3Wusx6qp",
    CognitoClientId: "cvuuuuogh6nmqm8491iiu1lh5",
    IdentityPoolId: "us-east-1:ce515980-6251-4cd1-ac59-68d09d97cefc"
}

export default AppConfig;