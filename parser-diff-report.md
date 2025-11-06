# Parser Diff Report

Generated: 2025-11-06T00:46:06.449Z

## Fixture: sample1

### Hand AST (raw)

```json
{
  "indicators": [],
  "assignments": [
    {
      "id": "a",
      "expr": {
        "type": "Number",
        "value": 1
      }
    },
    {
      "id": "_call",
      "expr": {
        "type": "Call",
        "callee": "plot",
        "args": [
          {
            "type": "Identifier",
            "name": "a"
          }
        ]
      }
    }
  ]
}
```

### Generated AST (raw)

```json
{
  "type": "Program",
  "assignments": [
    {
      "type": "Assignment",
      "id": "a",
      "expr": {
        "type": "Number",
        "value": 1
      }
    },
    {
      "type": "Call",
      "callee": "plot",
      "args": [
        "a"
      ]
    }
  ]
}
```

### Hand AST (normalized)

```json
{
  "indicators": [],
  "assignments": [
    {
      "id": "a",
      "expr": {
        "type": "Number",
        "value": 1
      }
    },
    {
      "id": "_call",
      "expr": {
        "type": "Call",
        "callee": "plot",
        "args": [
          {
            "type": "Identifier",
            "name": "a"
          }
        ]
      }
    }
  ]
}
```

### Generated AST (normalized)

```json
{
  "indicators": [],
  "assignments": [
    {
      "id": "a",
      "expr": {
        "type": "Number",
        "value": 1
      }
    },
    {
      "id": "_call",
      "expr": {
        "type": "Call",
        "callee": "plot",
        "args": [
          {
            "type": "Identifier",
            "name": "a"
          }
        ]
      }
    }
  ]
}
```

