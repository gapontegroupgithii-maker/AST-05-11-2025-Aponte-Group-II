# Parser Diff Report

Generated: 2025-11-05T05:22:25.064Z

## Fixture: sample1

### Hand AST

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

### Generated AST

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

### Structural differences summary

- Keys only in hand AST: indicators
- Keys only in generated AST: type

