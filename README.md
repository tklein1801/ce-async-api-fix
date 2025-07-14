# ep-async-api-fix

[![CI](https://ci.tools.tklein.it/api/v1/teams/main/pipelines/ce-async-api-fix/badge)](https://ci.tools.tklein.it/teams/main/pipelines/ce-async-api-fix?group=all)
![NPM Version](https://img.shields.io/npm/v/%40tklein1801%2Fce-async-api-fix)
![NPM License](https://img.shields.io/npm/l/%40tklein1801%2Fce-async-api-fix)
![NPM Last Update](https://img.shields.io/npm/last-update/%40tklein1801%2Fce-async-api-fix)

## Getting started

> [!IMPORTANT]
> This tool was not built to perform generic conversions on AsyncAPI documents. Rather, this tool was created to solve specific problems that arose when working with AsyncAPI documents in connection with SAP AEM/Solace PubSub+ and the SAP Event Enablement Framework. Before using this tool, it is recommended to check whether it also performs the desired/required adjustments.

### Use the tool

```bash
npx @tklein1801/ce-async-api-fix --help
```

### Start developing

1. Clone this repository

   ```bash
   git clone git@github.com:tklein1801/ce-async-api-fix.git

   cd ce-async-api-fix/
   ```

2. Install all required dependencies

   ```bash
   npm install
   ```

3. Run the programm

   ```bash
   npx tsx ./src/cli.ts
   ```

4. Build the programm

   ```bash
   npm run build
   ```

> [!NOTE]
> A new version of the NPM package is published using the CI pipeline if the tests and build were successful.

## About

This CLI is used to modify/correct AsyncAPI specifications in order to prepare them for import between SAP S/4Hana systems using the Event Enablement Framework and SAP AEM/Solace PubSub+. These steps are currently necessary due to the differences in how AsyncAPI specifications are used in the SAP S4/Hana environment.

### `convert`

The `convert` command can be used to correct two errors/problems that occur when generating/exporting an AsyncAPI specification for an event. Er stellt sicher, dass diese Schemas nahtlos in das Solace PubSub+|SAP AEM Event Portal importiert werden können.

> [!TIP]
> For more informations about the command you can run `npx @tklein1801/ce-async-api-fix convert --help`

**Problems Addressed**

- `messageTraits` do not define or affect the payload or message structure of events. Therefore, according to the definition, the events are not CloudEvents even if they are published as such by the system.
- The namespace is not set within the topic area, which would require manual adjustment of the topics for all imported events.

**Before**

```json
{
  "asyncapi": "2.0.0",
  "x-sap-catalog-spec-version": "1.0",
  "info": {
    "title": "Purchase Order Events",
    "version": "1.0.0",
    "description": "A purchase order is a document issued by a purchaser to a supplier indicating types, quantities, and agreed prices for products or services. The following events are available for purchase order\r\n\r\n * Created\r\n * Changed\r\n * Approved\r\n * Approval Rejected\r\n * Item Created\r\n * Item Changed\r\n * Item Deleted\r\n * Item Blocked\r\n * Item Unblocked\r\n"
  },
  "x-sap-api-type": "EVENT",
  "x-sap-shortText": "Informs a remote system about created and changed purchase orders in an SAP S/4HANA system.",
  "x-sap-stateInfo": {"state": "ACTIVE"},
  "channels": {
    "ce/sap/s4/beh/purchaseorder/v1/PurchaseOrder/Created/v1": {
      "subscribe": {
        "message": {
          "$ref": "#/components/messages/sap_s4_beh_purchaseorder_v1_PurchaseOrder_Created_v1"
        }
      }
    }
  },
  "components": {
    "messages": {
      "sap_s4_beh_purchaseorder_v1_PurchaseOrder_Created_v1": {
        "name": "sap.s4.beh.purchaseorder.v1.PurchaseOrder.Created.v1",
        "summary": "PurchaseOrder Created",
        "description": "This event is raised when a purchase order instance has been created.",
        "headers": {
          "properties": {
            "type": {"const": "sap.s4.beh.purchaseorder.v1.PurchaseOrder.Created.v1"},
            "datacontenttype": {"const": "application/json"}
          }
        },
        "payload": {
          "$ref": "#/components/schemas/sap_s4_beh_purchaseorder_v1_PurchaseOrder_Created_v1"
        },
        "traits": [{"$ref": "#/components/messageTraits/CloudEventContext"}]
      }
    },
    "schemas": {
      "sap_s4_beh_purchaseorder_v1_PurchaseOrder_Created_v1": {
        "type": "object",
        "properties": {"PurchaseOrder": {"type": "string", "maxLength": 10}}
      }
    },
    "messageTraits": {
      "CloudEventContext": {
        "headers": {
          "type": "object",
          "properties": {
            "specversion": {
              "description": "The version of the CloudEvents specification which the event uses. This enables the interpretation of the context.",
              "type": "string",
              "const": "1.0"
            },
            "type": {
              "description": "Type of occurrence which has happened. Often this property is used for routing, observability, policy enforcement, etc.",
              "type": "string",
              "minLength": 1
            },
            "source": {
              "description": "This describes the event producer.",
              "type": "string",
              "format": "uri-reference"
            },
            "subject": {
              "description": "The subject of the event in the context of the event producer (identified by source).",
              "type": "string",
              "minLength": 1
            },
            "id": {
              "description": "ID of the event.",
              "type": "string",
              "minLength": 1,
              "examples": ["6925d08e-bc19-4ad7-902e-bd29721cc69b"]
            },
            "time": {
              "description": "Timestamp of when the occurrence happened. Must adhere to RFC 3339.",
              "type": "string",
              "format": "date-time",
              "examples": ["2018-04-05T17:31:00Z"]
            },
            "datacontenttype": {
              "description": "Describe the data encoding format",
              "type": "string",
              "const": "application/json"
            }
          },
          "required": ["id", "specversion", "source", "type"]
        }
      }
    }
  },
  "externalDocs": {
    "description": "Business Documentation",
    "url": "https://help.sap.com/http.svc/ahp2/SAP_S4HANA_CLOUD_PE/2023.003/EN/ee/ab037f56e24beeb5d729de18055a65/frameset.htm"
  }
}
```

**After**

```json
{
  "asyncapi": "2.0.0",
  "x-sap-catalog-spec-version": "1.0",
  "info": {
    "title": "Purchase Order Events",
    "version": "1.0.0",
    "description": "A purchase order is a document issued by a purchaser to a supplier indicating types, quantities, and agreed prices for products or services. The following events are available for purchase order\r\n\r\n * Created\r\n * Changed\r\n * Approved\r\n * Approval Rejected\r\n * Item Created\r\n * Item Changed\r\n * Item Deleted\r\n * Item Blocked\r\n * Item Unblocked\r\n"
  },
  "x-sap-api-type": "EVENT",
  "x-sap-shortText": "Informs a remote system about created and changed purchase orders in an SAP S/4HANA system.",
  "x-sap-stateInfo": {
    "state": "ACTIVE"
  },
  "channels": {
    "tchibo/s4hana/dev/ce/sap/s4/beh/purchaseorder/v1/PurchaseOrder/Created/v1": {
      "subscribe": {
        "message": {
          "$ref": "#/components/messages/sap_s4_beh_purchaseorder_v1_PurchaseOrder_Created_v1"
        }
      }
    }
  },
  "components": {
    "messages": {
      "sap_s4_beh_purchaseorder_v1_PurchaseOrder_Created_v1": {
        "name": "sap.s4.beh.purchaseorder.v1.PurchaseOrder.Created.v1",
        "summary": "PurchaseOrder Created",
        "description": "This event is raised when a purchase order instance has been created.",
        "headers": {
          "properties": {
            "type": {
              "const": "sap.s4.beh.purchaseorder.v1.PurchaseOrder.Created.v1"
            },
            "datacontenttype": {
              "const": "application/json"
            }
          }
        },
        "payload": {
          "$ref": "#/components/schemas/sap_s4_beh_purchaseorder_v1_PurchaseOrder_Created_v1"
        },
        "traits": [
          {
            "$ref": "#/components/messageTraits/CloudEventContext"
          }
        ]
      }
    },
    "schemas": {
      "sap_s4_beh_purchaseorder_v1_PurchaseOrder_Created_v1": {
        "type": "object",
        "properties": {
          "specversion": {
            "description": "The version of the CloudEvents specification which the event uses. This enables the interpretation of the context.",
            "type": "string",
            "const": "1.0"
          },
          "type": {
            "description": "Type of occurrence which has happened. Often this property is used for routing, observability, policy enforcement, etc.",
            "type": "string",
            "minLength": 1
          },
          "source": {
            "description": "This describes the event producer.",
            "type": "string",
            "format": "uri-reference"
          },
          "subject": {
            "description": "The subject of the event in the context of the event producer (identified by source).",
            "type": "string",
            "minLength": 1
          },
          "id": {
            "description": "ID of the event.",
            "type": "string",
            "minLength": 1,
            "examples": ["6925d08e-bc19-4ad7-902e-bd29721cc69b"]
          },
          "time": {
            "description": "Timestamp of when the occurrence happened. Must adhere to RFC 3339.",
            "type": "string",
            "format": "date-time",
            "examples": ["2018-04-05T17:31:00Z"]
          },
          "datacontenttype": {
            "description": "Describe the data encoding format",
            "type": "string",
            "const": "application/json"
          },
          "data": {
            "type": "object",
            "properties": {
              "PurchaseOrder": {
                "type": "string",
                "maxLength": 10
              }
            }
          }
        },
        "required": ["id", "specversion", "source", "type", "data"]
      }
    },
    "messageTraits": {
      "CloudEventContext": {
        "headers": {
          "type": "object",
          "properties": {
            "specversion": {
              "description": "The version of the CloudEvents specification which the event uses. This enables the interpretation of the context.",
              "type": "string",
              "const": "1.0"
            },
            "type": {
              "description": "Type of occurrence which has happened. Often this property is used for routing, observability, policy enforcement, etc.",
              "type": "string",
              "minLength": 1
            },
            "source": {
              "description": "This describes the event producer.",
              "type": "string",
              "format": "uri-reference"
            },
            "subject": {
              "description": "The subject of the event in the context of the event producer (identified by source).",
              "type": "string",
              "minLength": 1
            },
            "id": {
              "description": "ID of the event.",
              "type": "string",
              "minLength": 1,
              "examples": ["6925d08e-bc19-4ad7-902e-bd29721cc69b"]
            },
            "time": {
              "description": "Timestamp of when the occurrence happened. Must adhere to RFC 3339.",
              "type": "string",
              "format": "date-time",
              "examples": ["2018-04-05T17:31:00Z"]
            },
            "datacontenttype": {
              "description": "Describe the data encoding format",
              "type": "string",
              "const": "application/json"
            }
          },
          "required": ["id", "specversion", "source", "type"]
        }
      }
    }
  },
  "externalDocs": {
    "description": "Business Documentation",
    "url": "https://help.sap.com/http.svc/ahp2/SAP_S4HANA_CLOUD_PE/2023.003/EN/ee/ab037f56e24beeb5d729de18055a65/frameset.htm"
  }
}
```

### `for-import`

The `for-import` command can be used to prepare an AsyncAPI specification version 2.0.0 for import or use in creating an Event Consumption Model. The steps and requirements for this process can be found in the [Tchibo documentation](https://wiki.tchibo-intranet.de/x/eY-xOw).

> [!TIP]
> For more informations about the command you can run `npx @tklein1801/ce-async-api-fix for-import --help`

## Improvements

The following aspects offer further potential for improving the tool:

- **Test coverage:** there is still a need for optimization, particularly in the area of conversion and modification of schemas. More comprehensive test coverage ensures greater security and stability in the further development of the tool.

- **Resolving references:** Currently, objects that are referenced according to the `v2.ReferenceObject` schema are not supported in many cases. The aim is to be able to resolve such references reliably and correctly.

- **Documentation:** The documentation should describe more clearly and in more detail which use cases are supported by the tool and which assumptions are made in order to be able to successfully modify AsyncAPI documents.

## Credits

| Source                                                        | Information                                                       |
| :------------------------------------------------------------ | :---------------------------------------------------------------- |
| [drizzle-team/brocli](https://github.com/drizzle-team/brocli) | This package was used to build the CLI                            |
| [@asyncapi/parser-js](https://github.com/asyncapi/parser-js/) | I've took the `spec-types` from `/packages/parser/src/spec-types` |
