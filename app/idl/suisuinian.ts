/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/suisuinian.json`.
 */
export type Suisuinian = {
  "address": "F9UhuiZHK4HK3L7KJXMs5YjYoq5fmogdcgkajNTKYzCu",
  "metadata": {
    "name": "suisuinian",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addComment",
      "discriminator": [
        59,
        175,
        193,
        236,
        134,
        214,
        75,
        141
      ],
      "accounts": [
        {
          "name": "post",
          "writable": true
        },
        {
          "name": "commentPage",
          "writable": true
        },
        {
          "name": "author",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "content",
          "type": "string"
        },
        {
          "name": "parentIndex",
          "type": "u64"
        }
      ]
    },
    {
      "name": "createPost",
      "discriminator": [
        123,
        92,
        184,
        29,
        231,
        24,
        15,
        202
      ],
      "accounts": [
        {
          "name": "post",
          "writable": true,
          "signer": true
        },
        {
          "name": "userProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "author"
              }
            ]
          }
        },
        {
          "name": "author",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "topic",
          "type": "string"
        },
        {
          "name": "content",
          "type": "string"
        }
      ]
    },
    {
      "name": "followUser",
      "discriminator": [
        126,
        176,
        97,
        36,
        63,
        145,
        4,
        134
      ],
      "accounts": [
        {
          "name": "userFollow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  102,
                  111,
                  108,
                  108,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "follower"
              },
              {
                "kind": "account",
                "path": "target"
              }
            ]
          }
        },
        {
          "name": "follower",
          "writable": true,
          "signer": true
        },
        {
          "name": "target"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initCommentPage",
      "discriminator": [
        50,
        38,
        31,
        12,
        48,
        244,
        172,
        110
      ],
      "accounts": [
        {
          "name": "post",
          "writable": true
        },
        {
          "name": "newPage",
          "writable": true
        },
        {
          "name": "author",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initUserProfile",
      "discriminator": [
        148,
        35,
        126,
        247,
        28,
        169,
        135,
        175
      ],
      "accounts": [
        {
          "name": "userProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "likeComment",
      "discriminator": [
        129,
        249,
        45,
        219,
        85,
        221,
        49,
        38
      ],
      "accounts": [
        {
          "name": "post"
        },
        {
          "name": "commentPage",
          "writable": true
        },
        {
          "name": "userCommentLikes",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  99,
                  111,
                  109,
                  109,
                  101,
                  110,
                  116,
                  95,
                  108,
                  105,
                  107,
                  101,
                  115
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "post"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "commentGlobalIndex",
          "type": "u64"
        }
      ]
    },
    {
      "name": "likePost",
      "discriminator": [
        45,
        242,
        154,
        71,
        63,
        133,
        54,
        186
      ],
      "accounts": [
        {
          "name": "post"
        },
        {
          "name": "userLike",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  108,
                  105,
                  107,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "post"
              }
            ]
          }
        },
        {
          "name": "author",
          "writable": true
        },
        {
          "name": "authorProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "author"
              }
            ]
          }
        },
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "tipPost",
      "discriminator": [
        23,
        199,
        181,
        108,
        91,
        128,
        240,
        112
      ],
      "accounts": [
        {
          "name": "post",
          "writable": true
        },
        {
          "name": "author",
          "writable": true
        },
        {
          "name": "authorProfile",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  112,
                  114,
                  111,
                  102,
                  105,
                  108,
                  101
                ]
              },
              {
                "kind": "account",
                "path": "author"
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountLamports",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unfollowUser",
      "discriminator": [
        204,
        183,
        196,
        110,
        97,
        165,
        226,
        213
      ],
      "accounts": [
        {
          "name": "userFollow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  102,
                  111,
                  108,
                  108,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "follower"
              },
              {
                "kind": "account",
                "path": "target"
              }
            ]
          }
        },
        {
          "name": "follower",
          "writable": true,
          "signer": true
        },
        {
          "name": "target"
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "commentPage",
      "discriminator": [
        236,
        61,
        116,
        216,
        235,
        35,
        229,
        234
      ]
    },
    {
      "name": "post",
      "discriminator": [
        8,
        147,
        90,
        186,
        185,
        56,
        192,
        150
      ]
    },
    {
      "name": "userCommentLikes",
      "discriminator": [
        25,
        154,
        191,
        146,
        168,
        92,
        28,
        150
      ]
    },
    {
      "name": "userFollow",
      "discriminator": [
        180,
        47,
        223,
        244,
        165,
        108,
        59,
        225
      ]
    },
    {
      "name": "userLike",
      "discriminator": [
        72,
        184,
        5,
        221,
        177,
        49,
        213,
        198
      ]
    },
    {
      "name": "userProfile",
      "discriminator": [
        32,
        37,
        119,
        205,
        179,
        180,
        13,
        194
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "contentTooLong",
      "msg": "The content is too long."
    },
    {
      "code": 6001,
      "name": "pageFull",
      "msg": "The comment page is full."
    },
    {
      "code": 6002,
      "name": "commentIndexOutOfBounds",
      "msg": "Comment index out of bounds for tracking."
    },
    {
      "code": 6003,
      "name": "alreadyLiked",
      "msg": "Already liked this comment."
    },
    {
      "code": 6004,
      "name": "commentNotFound",
      "msg": "Comment not found in page."
    }
  ],
  "types": [
    {
      "name": "commentPage",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "post",
            "type": "pubkey"
          },
          {
            "name": "pageIndex",
            "type": "u64"
          },
          {
            "name": "comments",
            "type": {
              "vec": {
                "defined": {
                  "name": "compactComment"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "compactComment",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "author",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "parentIndex",
            "type": "u64"
          },
          {
            "name": "content",
            "type": "string"
          },
          {
            "name": "likeCount",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "post",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "author",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          },
          {
            "name": "topic",
            "type": "string"
          },
          {
            "name": "content",
            "type": "string"
          },
          {
            "name": "commentCount",
            "type": "u64"
          },
          {
            "name": "lastCommentPage",
            "type": {
              "option": "pubkey"
            }
          }
        ]
      }
    },
    {
      "name": "userCommentLikes",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "post",
            "type": "pubkey"
          },
          {
            "name": "likesBitmap",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          }
        ]
      }
    },
    {
      "name": "userFollow",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "follower",
            "type": "pubkey"
          },
          {
            "name": "target",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "userLike",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "post",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "userProfile",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "postCount",
            "type": "u64"
          },
          {
            "name": "likeCount",
            "type": "u64"
          },
          {
            "name": "tipCount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};
