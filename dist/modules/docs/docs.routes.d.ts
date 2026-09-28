declare const router: import("express-serve-static-core").Router;
export declare const openApiSpec: {
    openapi: string;
    info: {
        title: string;
        version: string;
        description: string;
        contact: {
            name: string;
            email: string;
            url: string;
        };
    };
    servers: {
        url: string;
        description: string;
    }[];
    components: {
        securitySchemes: {
            BearerAuth: {
                type: string;
                scheme: string;
                bearerFormat: string;
                description: string;
            };
        };
    };
    paths: {
        '/auth/super-admin': {
            post: {
                summary: string;
                description: string;
                tags: string[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    email: {
                                        type: string;
                                        format: string;
                                        example: string;
                                    };
                                    password: {
                                        type: string;
                                        minLength: number;
                                        example: string;
                                    };
                                    firstName: {
                                        type: string;
                                        example: string;
                                    };
                                    lastName: {
                                        type: string;
                                        example: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    201: {
                        description: string;
                    };
                    400: {
                        description: string;
                    };
                };
            };
        };
        '/auth/login': {
            post: {
                summary: string;
                tags: string[];
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                type: string;
                                required: string[];
                                properties: {
                                    email: {
                                        type: string;
                                        format: string;
                                        example: string;
                                    };
                                    password: {
                                        type: string;
                                        example: string;
                                    };
                                };
                            };
                        };
                    };
                };
                responses: {
                    200: {
                        description: string;
                    };
                    401: {
                        description: string;
                    };
                };
            };
        };
        '/verify/{token}': {
            get: {
                summary: string;
                description: string;
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                    404: {
                        description: string;
                    };
                };
            };
        };
        '/companies': {
            get: {
                summary: string;
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    201: {
                        description: string;
                    };
                };
            };
        };
        '/crm/customers': {
            get: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    201: {
                        description: string;
                    };
                };
            };
        };
        '/crm/customers/{id}/360': {
            get: {
                summary: string;
                description: string;
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/procurement/vendors': {
            get: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    201: {
                        description: string;
                    };
                };
            };
        };
        '/procurement/po': {
            get: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    201: {
                        description: string;
                    };
                };
            };
        };
        '/procurement/po/{id}/approve': {
            post: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/procurement/po/{id}/pdf': {
            get: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/sales/pi': {
            get: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    201: {
                        description: string;
                    };
                };
            };
        };
        '/sales/pi/{id}/issue': {
            post: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/sales/pi/{id}/pdf': {
            get: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/finance/payments': {
            get: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    201: {
                        description: string;
                    };
                };
            };
        };
        '/finance/followups': {
            get: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    201: {
                        description: string;
                    };
                };
            };
        };
        '/finance/followups/dashboard': {
            get: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/qr/scan': {
            post: {
                summary: string;
                description: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/audit': {
            get: {
                summary: string;
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/sales/quotations': {
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: ({
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        default?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                        default: number;
                    };
                })[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    201: {
                        description: string;
                    };
                };
            };
        };
        '/sales/quotations/{id}': {
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            patch: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/sales/quotations/{id}/revision': {
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/sales/quotations/{id}/convert-to-order': {
            post: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/sales/quotations/{id}/pdf': {
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/sales/quotations/templates': {
            get: {
                summary: string;
                tags: string[];
                parameters: {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/sales/orders': {
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    201: {
                        description: string;
                    };
                };
            };
        };
        '/sales/orders/{id}': {
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            patch: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/sales/orders/{id}/status': {
            patch: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/sales/orders/{id}/timeline': {
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/sales/orders/{id}/pdf': {
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/logistics/packing-lists': {
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    201: {
                        description: string;
                    };
                };
            };
        };
        '/logistics/packing-lists/{id}': {
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/logistics/packing-lists/{id}/dispatch': {
            post: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/logistics/packing-lists/{id}/pdf': {
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/logistics/packing-lists/packet-types': {
            get: {
                summary: string;
                tags: string[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/logistics/packing-lists/order-bom/{orderId}': {
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/warehouse/hardware-catalog': {
            get: {
                summary: string;
                tags: string[];
                parameters: {
                    name: string;
                    in: string;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    201: {
                        description: string;
                    };
                };
            };
        };
        '/warehouse/hardware-catalog/{id}': {
            patch: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/warehouse/hardware-issues': {
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    201: {
                        description: string;
                    };
                };
            };
        };
        '/warehouse/hardware-issues/{id}': {
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/warehouse/hardware-issues/{id}/sign-off': {
            patch: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/warehouse/hardware-issues/{id}/pdf': {
            get: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/crm/check-duplicates': {
            post: {
                summary: string;
                description: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/crm/merge': {
            post: {
                summary: string;
                tags: string[];
                security: {
                    BearerAuth: never[];
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
        '/acknowledge-receipt/{token}': {
            get: {
                summary: string;
                description: string;
                tags: string[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
            post: {
                summary: string;
                tags: string[];
                parameters: {
                    name: string;
                    in: string;
                    required: boolean;
                    schema: {
                        type: string;
                    };
                }[];
                responses: {
                    200: {
                        description: string;
                    };
                };
            };
        };
    };
};
export default router;
//# sourceMappingURL=docs.routes.d.ts.map