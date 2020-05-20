import AppConfig from './AppConfig';

class MinervaClient {

    constructor(baseUrl) {
        this.baseUrl = baseUrl;
        this.currentUser = null;
        this.GRANTS = ['Admin', 'Read', 'Write'];
        this.guest = false;
    }

    loggedIn() {
        return this.currentUser !== null;
    }

    setUser(user) {
        this.currentUser = user;
    }

    setAnonToken(anonToken) {
        this.anonToken = anonToken;
    }

    setGuest(guest) {
        this.guest = guest;
    }

    getRepositories() {
        return this.apiFetch('GET', '/repository');
    }

    getRepository(uuid) {
        return this.apiFetch('GET', `/repository/${uuid}`);
    }

    updateRepository(repository) {
        let data = {
            name: repository.name,
            raw_storage: repository.raw_storage,
            access: repository.access
        };
        return this.apiFetch('PUT', `/repository/${repository.uuid}`, { body: data });
    }

    getImports(repositoryUuid) {
        return this.apiFetch('GET', '/repository/' + repositoryUuid + '/imports');
    }

    createRepository(data) {
        return this.apiFetch('POST', '/repository', { body: data });
    }

    deleteRepository(uuid) {
        return this.apiFetch('DELETE', '/repository/' + uuid);
    }

    deleteImage(uuid) {
        return this.apiFetch('DELETE', '/image/' + uuid);
    }

    createImport(data) {
        return this.apiFetch('POST', '/import', { body: data });
    }

    updateImport(uuid, data) {
        return this.apiFetch('PUT', '/import/' + uuid, { body: data });
    }

    getImportCredentials(uuid) {
        return this.apiFetch('GET', '/import/' + uuid + '/credentials');
    }

    listFilesetsInImport(uuid) {
        return this.apiFetch('GET', '/import/' + uuid + '/filesets');
    }

    listImportsInRepository(uuid) {
        return this.apiFetch('GET', '/repository/' + uuid + '/imports');
    }

    listImagesInFileset(uuid) {
        return this.apiFetch('GET', '/fileset/' + uuid + '/images');
    }

    listImagesInRepository(uuid) {
        return this.apiFetch('GET', `/repository/${uuid}/images`);
    }

    listIncompleteImports() {
        return this.apiFetch('GET', '/import/incomplete');
    }

    listGrantsForRepository(uuid) {
        return this.apiFetch('GET', `/repository/${uuid}/grants`);
    }

    findUser(search) {
        return this.apiFetch('GET', `/user/find/${search}`);
    }

    findGroup(search) {
        return this.apiFetch('GET', `/group/find/${search}`);
    }

    getCognitoDetails() {
        return this.apiFetch('GET', '/cognito_details');
    }

    grantPermissionToRepository(userUuid, repositoryUuid, grantType) {
        if (!this.GRANTS.includes(grantType)) {
            console.error('Invalid grant: ', grantType);
            return Promise.reject();
        }
        return this.apiFetch('POST', '/grant', {
            body: {
                "uuid": repositoryUuid,
                "grantee": userUuid,
                "resource": "repository",
                "permissions": [grantType]
            }
        })
    }

    getImageTile(uuid, level, x, y, z = 0, t = 0) {
        let channelPathParams = '0,FFFFFF,0,1';
        return this.apiFetch(
            'GET',
            '/image/' + uuid + '/render-tile/' + x + '/' + y + '/' + z + '/' + t
            + '/' + level + '/' + channelPathParams, { binary: true, headers: { "Accept": "image/jpeg" } });

    }

    getPrerenderedImageTile(uuid, level, x, y, renderingSettingsUuid, z = 0, t = 0) {
        return this.apiFetch(
            'GET',
            '/image/' + uuid + '/prerendered-tile/' + x + '/' + y + '/' + z + '/' + t
            + '/' + level + '/' + renderingSettingsUuid, { binary: true, headers: { "Accept": "image/jpeg" } });

    }

    getImage(uuid) {
        return this.apiFetch('GET', '/image/' + uuid);
    }

    getImageDimensions(uuid) {
        return this.apiFetch('GET', '/image/' + uuid + '/dimensions');
    }

    deleteGrant(resourceUuid, subjectUuid) {
        return this.apiFetch('DELETE', `/grant/resource/${resourceUuid}/subject/${subjectUuid}`);
    }

    createRenderingSettings(uuid, json) {
        return this.apiFetch('POST', `/image/${uuid}/rendering_settings`, { body: json });
    }

    apiFetch(method, route, config = {}) {
        console.log(method, route, config);
        if (!this.currentUser) {
            console.warn("Tried to call apiFetch but no current session available.");
            return Promise.reject();
        }
        let params = config.params;
        let body = config.body;
        let binary = config.binary;
        const defaultHeaders = {
            'Content-Type': 'application/json'
        };
        let headers = { ...defaultHeaders, ...config.headers };

        let url = this.baseUrl + route;

        if (params) {
            const queryParams = Object.keys(params)
                .map(key => key + '=' + params[key])
                .join('&');
            if (queryParams.length > 0) {
                url += '?' + queryParams;
            }
        }

        const args = {
            method,
            headers,
            mode: 'cors'
            //cache: 'no-cache'
        };

        if (body !== null) {
            args['body'] = JSON.stringify(body)
        }
        if (this.guest) {
            return this._fetch(url, args, 'Anonymous', headers, binary);
        } else {
            
            let session = this.currentUser.getSession((err, session) => {
                if (err) {
                    console.error(err);
                    return Promise.reject("Error in getSession");
                }
                return this._fetch(url, args, session.idToken.jwtToken, headers, binary);
            });
            if (!session) {
                console.error("Session is undefined: ", session);
                return Promise.reject("Session is undefined");
            }
            return session;
        }
    }

    _fetch(url, args, token, headers, binary) {
        headers["Authorization"] = 'Bearer ' + token;
        return fetch(url, args).then(response => {
            // Turn HTTP error responses into rejected promises
            if (!response.ok) {
                return response.text()
                    .then(text => {
                        return Promise.reject({
                            status: response.status,
                            message: text
                        });
                    }).catch(err => {
                        console.error(err);
                        return Promise.reject(err);
                    });
            }

            if (response.status === 204) {
                return Promise.resolve();
            }
            else if (!binary) {
                return response.json();
            } else {
                return response.blob();
            }
        }).catch(err => {
            console.error(err);
            return Promise.reject(err);
        });
    }

    getToken() {
        if (!this.currentUser) {
            return Promise.reject();
        }
        if (this.guest) {
            return Promise.resolve('Anonymous');
        }

        return new Promise((resolve, reject) => {
            this.currentUser.getSession((err, session) => {
                if (err) {
                    console.error(err);
                    return Promise.reject("Error in getSession");
                }
                resolve('Bearer ' + session.idToken.jwtToken);
            });
        });

    }


}

var Client = new MinervaClient(AppConfig.minervaBaseUrl + '/' + AppConfig.minervaStage);

export default Client;