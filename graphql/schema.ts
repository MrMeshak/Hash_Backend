import { GraphQLObjectType, GraphQLSchema, GraphQLString, GraphQLBoolean, GraphQLInt, GraphQLID, GraphQLList } from 'graphql';
import prisma from '../utils/prismaClient';
import { removeSensitiveUserData, authCheckUser, authCheckCurrentUser, authCheckCurrentUserOrHasPermissions, authCheckPermissions, authCheckUserIsAuthor } from '../utils/graphQlHelper';
import { User } from '@prisma/client';
import { userInfo } from 'os';
import { parentPort } from 'worker_threads';
import { resolve } from 'path';

const UserType: GraphQLObjectType = new GraphQLObjectType({
  name: 'User',
  fields: () => ({
    id: { type: GraphQLID },
    email: { type: GraphQLString },

    firstname: { type: GraphQLString },
    lastname: { type: GraphQLString },
    profileImg: { type: GraphQLString },

    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },

    userPosts: {
      type: new GraphQLList(PostType),
      async resolve(parent, args, context) {
        authCheckCurrentUserOrHasPermissions(context.isAuth, parent.id, context.userId, context.permissions, 'ADMIN', context.error);
        const user = await prisma.user.findUnique({
          where: {
            id: parent.id
          },
          select: {
            userPosts: true
          }
        });
        if (!user) {
          throw Error('User could not be found');
        }
        return user.userPosts;
      }
    },
    upVotedPosts: {
      type: new GraphQLList(PostType),
      async resolve(parent, args, context) {
        authCheckCurrentUserOrHasPermissions(context.isAuth, parent.id, context.userId, context.permissions, 'ADMIN', context.error);
        const user = await prisma.user.findUnique({
          where: {
            id: parent.id
          },
          select: {
            upVotedPosts: true
          }
        });
        if (!user) {
          throw Error('User could not be found');
        }
        return user.upVotedPosts;
      }
    }
  })
});

const PostType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Post',
  fields: () => ({
    id: { type: GraphQLID },
    title: { type: GraphQLString },
    description: { type: GraphQLString },
    category: { type: GraphQLString },
    status: { type: GraphQLString },
    upVotes: { type: GraphQLInt },

    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },

    authorId: { type: GraphQLID },

    author: {
      type: UserType,
      async resolve(parent, args, context) {
        const user = await prisma.user.findUnique({
          where: {
            id: parent.authorId
          }
        });
        if (!user) {
          throw Error('User could not be found');
        }
        return removeSensitiveUserData(user);
      }
    },
    currentUserUpVote: {
      type: GraphQLBoolean,
      async resolve(parent, args, context) {
        if (!context.isAuth) {
          return false;
        }
        const userUpVoteExists = await prisma.post.findUnique({
          where: {
            id: parent.id
          },
          select: {
            userUpvoteList: {
              where: {
                id: context.userId
              }
            }
          }
        });
        if (!userUpVoteExists) {
          return false;
        }
        if (userUpVoteExists.userUpvoteList.length === 0) {
          return false;
        }
        return true;
      }
    },
    userUpVoteList: {
      type: new GraphQLList(UserType),
      async resolve(parent, args, context) {
        authCheckPermissions(context.isAuth, context.permissions, 'ADMIN', context.error);
      }
    },
    comments: {
      type: new GraphQLList(CommentType),
      async resolve(parent, args, context) {
        const post = await prisma.post.findUnique({
          where: {
            id: parent.id
          },
          select: {
            comments: true
          }
        });
        if (!post) {
          throw Error('Post could not be found');
        }
        return post.comments;
      }
    },
    commentCount: {
      type: GraphQLInt,
      async resolve(parent, args, context) {
        const postWithCount = await prisma.post.findUnique({
          where: {
            id: parent.id
          },
          include: {
            _count: {
              select: { comments: true }
            }
          }
        });
        return postWithCount?._count.comments;
      }
    }
  })
});

const CommentType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Comment',
  fields: () => ({
    id: { type: GraphQLID },
    content: { type: GraphQLString },

    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },

    authorId: { type: GraphQLID },
    postId: { type: GraphQLID },

    author: {
      type: UserType,
      async resolve(parent, args, context) {
        const user = await prisma.user.findUnique({
          where: {
            id: parent.authorId
          }
        });
        if (!user) {
          throw Error('User could not be found');
        }
        return removeSensitiveUserData(user);
      }
    },
    post: {
      type: PostType,
      async resolve(parent, args, context) {}
    },
    replies: {
      type: new GraphQLList(ReplyType),
      async resolve(parent, args, context) {
        const replies = await prisma.reply.findMany({
          where: {
            commentId: parent.id
          }
        });
        if (!replies) {
          return [];
        }
        return replies;
      }
    }
  })
});

const ReplyType: GraphQLObjectType = new GraphQLObjectType({
  name: 'Reply',
  fields: () => ({
    id: { type: GraphQLID },
    content: { type: GraphQLString },

    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },

    commentId: { type: GraphQLID },
    authorId: { type: GraphQLID },

    comment: {
      type: CommentType,
      resolve(parent, args, context) {}
    },
    author: {
      type: UserType,
      async resolve(parent, args, context) {
        const user = await prisma.user.findUnique({
          where: {
            id: parent.authorId
          }
        });
        if (!user) {
          throw Error('User could not be found');
        }
        return removeSensitiveUserData(user);
      }
    }
  })
});

const RootQueryType = new GraphQLObjectType({
  name: 'Query',
  fields: () => ({
    currentUser: {
      type: UserType,
      async resolve(parent, args, context) {
        authCheckUser(context.isAuth, context.error);
        const user = await prisma.user.findUnique({
          where: {
            id: context.userId
          }
        });
        if (!user) {
          throw new Error('User could not be found');
        }
        return user;
      }
    },
    user: {
      type: UserType,
      args: {
        userId: { type: GraphQLID }
      },
      async resolve(parent, args, context) {
        authCheckPermissions(context.isAuth, context.permissions, 'ADMIN', context.error);
        const user = await prisma.user.findUnique({
          where: {
            id: context.userId
          }
        });
        if (!user) {
          throw new Error('User could not be found');
        }
        return user;
      }
    },
    post: {
      type: PostType,
      args: {
        postId: { type: GraphQLID }
      },
      async resolve(parent, args, context) {
        const post = await prisma.post.findUnique({
          where: {
            id: args.postId
          }
        });
        if (!post) {
          throw Error('Post could not be found');
        }
        return post;
      }
    },
    posts: {
      type: new GraphQLList(PostType),
      async resolve(parent, args, context) {
        const posts = await prisma.post.findMany({
          orderBy: {
            createdAt: 'desc'
          }
        });
        return posts;
      }
    },
    filteredPosts: {
      type: new GraphQLList(PostType),
      args: {
        filter: { type: GraphQLString },
        sort: { type: GraphQLString }
      },
      async resolve(parent, args, context) {
        //Case: Has Filter
        if (!!args.filter) {
          if (args.sort === 'dateDesc') {
            const posts = prisma.post.findMany({
              where: {
                category: args.filter
              },
              orderBy: {
                createdAt: 'desc'
              }
            });
            return posts;
          }
          if (args.sort === 'dateAsc') {
            const posts = prisma.post.findMany({
              where: {
                category: args.filter
              },
              orderBy: {
                createdAt: 'asc'
              }
            });
            return posts;
          }
          if (args.sort === 'upVotesDesc') {
            const posts = prisma.post.findMany({
              where: {
                category: args.filter
              },
              orderBy: {
                upVotes: 'desc'
              }
            });
            return posts;
          }
          if (args.sort === 'upVotesAsc') {
            const posts = prisma.post.findMany({
              where: {
                category: args.filter
              },
              orderBy: {
                upVotes: 'asc'
              }
            });
            return posts;
          }
          if (args.sort === 'commentCountDesc') {
            const posts = prisma.post.findMany({
              where: {
                category: args.filter
              },
              orderBy: {
                comments: {
                  _count: 'desc'
                }
              }
            });
            return posts;
          }
          if (args.sort === 'commentCountAsc') {
            const posts = prisma.post.findMany({
              where: {
                category: args.filter
              },
              orderBy: {
                comments: {
                  _count: 'asc'
                }
              }
            });
            return posts;
          }

          const posts = await prisma.post.findMany({
            where: {
              category: args.filter
            },
            orderBy: {
              createdAt: 'desc'
            }
          });
          return posts;
        }

        // Case: No Filter
        if (!args.filter) {
          if (args.sort === 'dateDesc') {
            const posts = prisma.post.findMany({
              orderBy: {
                createdAt: 'desc'
              }
            });
            return posts;
          }
          if (args.sort === 'dateAsc') {
            const posts = prisma.post.findMany({
              orderBy: {
                createdAt: 'asc'
              }
            });
            return posts;
          }
          if (args.sort === 'upVotesDesc') {
            const posts = prisma.post.findMany({
              orderBy: {
                upVotes: 'desc'
              }
            });
            return posts;
          }
          if (args.sort === 'upVotesAsc') {
            const posts = prisma.post.findMany({
              orderBy: {
                upVotes: 'asc'
              }
            });
            return posts;
          }
          if (args.sort === 'commentCountDesc') {
            const posts = prisma.post.findMany({
              orderBy: {
                comments: {
                  _count: 'desc'
                }
              }
            });
            return posts;
          }
          if (args.sort === 'commentCountAsc') {
            const posts = prisma.post.findMany({
              orderBy: {
                comments: {
                  _count: 'asc'
                }
              }
            });
            return posts;
          }
          const posts = await prisma.post.findMany({
            orderBy: {
              createdAt: 'desc'
            }
          });
          return posts;
        }
      }
    },
    postsByStatus: {
      type: new GraphQLList(PostType),
      args: {
        status: { type: GraphQLString }
      },
      async resolve(parent, args, context) {
        const posts = prisma.post.findMany({
          where: {
            status: args.status
          },
          orderBy: {
            upVotes: 'desc'
          }
        });
        return posts;
      }
    },
    libraryCountByStatus: {
      type: GraphQLInt,
      args: {
        status: { type: GraphQLString }
      },
      async resolve(parent, args, context) {
        const count = prisma.post.count({
          where: {
            status: args.status
          }
        });
        return count;
      }
    }
  })
});

const MutationType = new GraphQLObjectType({
  name: 'Mutation',
  fields: () => ({
    addPost: {
      type: PostType,
      args: {
        title: { type: GraphQLString },
        description: { type: GraphQLString },
        category: { type: GraphQLString }
      },
      async resolve(parent, args, context) {
        authCheckUser(context.isAuth, context.error);
        const post = await prisma.post.create({
          data: {
            title: args.title,
            description: args.description,
            category: args.category,
            authorId: context.userId
          }
        });
        return post;
      }
    },
    toggleUpVote: {
      type: PostType,
      args: {
        postId: { type: GraphQLID }
      },
      async resolve(parent, args, context) {
        authCheckUser(context.isAuth, context.error);
        const upvoted = await prisma.post.findUnique({
          where: {
            id: args.postId
          },
          select: {
            userUpvoteList: {
              where: {
                id: context.userId
              }
            }
          }
        });
        if (!upvoted) {
          throw Error('Post could not be found');
        }

        if (upvoted.userUpvoteList.length === 0) {
          const post = await prisma.post.update({
            where: {
              id: args.postId
            },
            data: {
              upVotes: { increment: 1 },
              userUpvoteList: {
                connect: { id: context.userId }
              }
            }
          });
          return post;
        }

        const post = await prisma.post.update({
          where: {
            id: args.postId
          },
          data: {
            upVotes: { decrement: 1 },
            userUpvoteList: {
              disconnect: { id: context.userId }
            }
          }
        });
        return post;
      }
    },

    addComment: {
      type: CommentType,
      args: {
        postId: { type: GraphQLID },
        content: { type: GraphQLString }
      },
      async resolve(parent, args, context) {
        authCheckUser(context.isAuth, context.error);
        const comment = await prisma.comment.create({
          data: {
            content: args.content,
            authorId: context.userId,
            postId: args.postId
          }
        });
        return comment;
      }
    },
    addReply: {
      type: ReplyType,
      args: {
        commentId: { type: GraphQLID },
        content: { type: GraphQLString }
      },
      async resolve(parent, args, context) {
        authCheckUser(context.isAuth, context.error);
        const reply = await prisma.reply.create({
          data: {
            content: args.content,
            commentId: args.commentId,
            authorId: context.userId
          }
        });
        return reply;
      }
    },
    updatePost: {
      type: PostType,
      args: {
        postId: { type: GraphQLID },
        title: { type: GraphQLString },
        description: { type: GraphQLString },
        category: { type: GraphQLString }
      },
      async resolve(parent, args, context) {
        authCheckUser(context.isAuth, context.error);
        const post = await prisma.post.findUnique({
          where: {
            id: args.postId
          }
        });
        if (!post) {
          throw Error('Post could not be found');
        }
        authCheckUserIsAuthor(post.authorId, context.userId);
        const updatedPost = await prisma.post.update({
          where: {
            id: args.postId
          },
          data: {
            title: args.title,
            description: args.description,
            category: args.category
          }
        });
        return updatedPost;
      }
    },
    deletePost: {
      type: PostType,
      args: {
        postId: { type: GraphQLID }
      },
      async resolve(parent, args, context) {
        authCheckUser(context.isAuth, context.error);
        const post = await prisma.post.findUnique({
          where: {
            id: args.postId
          },
          select: {
            id: true,
            authorId: true,
            comments: {
              select: {
                id: true
              }
            }
          }
        });
        if (!post) {
          throw Error('Post could not be found');
        }
        authCheckUserIsAuthor(post.authorId, context.userId);
        const commentIds: string[] = post.comments.map((comment) => comment.id);
        const deleteReplies = prisma.reply.deleteMany({
          where: {
            commentId: { in: commentIds }
          }
        });
        const deleteComments = prisma.comment.deleteMany({
          where: {
            postId: args.postId
          }
        });
        const deletePost = prisma.post.delete({
          where: {
            id: args.postId
          }
        });

        const [numRepliesDeleted, numCommentsDeleted, deletedPost] = await prisma.$transaction([deleteReplies, deleteComments, deletePost]);

        return deletePost;
      }
    }
  })
});

export default new GraphQLSchema({
  query: RootQueryType,
  mutation: MutationType
});
