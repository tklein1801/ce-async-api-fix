# ep-async-api-fix

![CI](https://ci.tools.tklein.it/api/v1/teams/main/pipelines/ce-async-api-fix/badge)

## Getting started

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

This is a compact CLI tool for fixing two errors that might occur when generating an AsyncAPI schema for SAP events. It ensures that these schemas can be seamlessly imported into the Solace PubSub+|SAP AEM Event Portal.

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
