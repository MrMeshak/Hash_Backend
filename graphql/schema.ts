import {
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLInt,
  GraphQLID,
  GraphQLList,
} from "graphql";
import prisma from "../utils/prismaClient";
import { removeSensitiveUserData, authCheckUser } from "../utils/graphQlHelper";
import { User } from "@prisma/client";
import { userInfo } from "os";

const UserType: GraphQLObjectType = new GraphQLObjectType({
  name: "User",
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
        const user = await prisma.user.findUnique({
          where: {
            id: parent.id,
          },
          select: {
            userPosts: true,
          },
        });
        return user?.userPosts;
      },
    },
    upVotedPosts: {
      type: new GraphQLList(PostType),
      async resolve(parent, args, context) {
        const user = await prisma.user.findUnique({
          where: {
            id: parent.id,
          },
          select: {
            upVotedPosts: true,
          },
        });
        if (!user) {
          throw Error("User could not be found");
        }
        return user.upVotedPosts;
      },
    },
  }),
});

const PostType: GraphQLObjectType = new GraphQLObjectType({
  name: "Post",
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
            id: parent.authorId,
          },
        });
        if (!user) {
          throw Error("User could not be found");
        }
        return removeSensitiveUserData(user);
      },
    },
    userUpVoteList: {
      type: new GraphQLList(UserType),
      async resolve(parent, args, context) {},
    },
    comments: {
      type: new GraphQLList(CommentType),
      async resolve(parent, args, context) {
        const post = await prisma.post.findUnique({
          where: {
            id: parent.id,
          },
          select: {
            comments: true,
          },
        });
        if (!post) {
          throw Error("Post could not be found");
        }
        return post.comments;
      },
    },
  }),
});

const CommentType: GraphQLObjectType = new GraphQLObjectType({
  name: "Comment",
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
            id: parent.authorId,
          },
        });
        if (!user) {
          throw Error("User could not be found");
        }
        return removeSensitiveUserData(user);
      },
    },
    post: {
      type: PostType,
      async resolve(parent, args, context) {},
    },
    replies: {
      type: new GraphQLList(ReplyType),
      resolve(parent, args, context) {},
    },
  }),
});

const ReplyType: GraphQLObjectType = new GraphQLObjectType({
  name: "Reply",
  fields: () => ({
    id: { type: GraphQLID },
    content: { type: GraphQLString },

    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },

    commentId: { type: GraphQLID },
    authorId: { type: GraphQLID },

    comment: {
      type: CommentType,
      resolve(parent, args, context) {},
    },
    author: {
      type: UserType,
      resolve(parent, args, context) {},
    },
  }),
});

const RootQueryType = new GraphQLObjectType({
  name: "Query",
  fields: () => ({
    currentUser: {
      type: UserType,
      async resolve(parent, args, context) {
        authCheckUser(context.isAuth, context.error);
        const user = await prisma.user.findUnique({
          where: {
            id: context.userId,
          },
        });
        if (!user) {
          throw new Error("User could not be found");
        }
        return removeSensitiveUserData(user);
      },
    },
    post: {
      type: PostType,
      args: {
        postId: { type: GraphQLID },
      },
      async resolve(parent, args, context) {
        const post = await prisma.post.findUnique({
          where: {
            id: args.postId,
          },
        });
        if (!post) {
          throw Error("Post could not be found");
        }
        return post;
      },
    },
    posts: {
      type: new GraphQLList(PostType),
      async resolve(parent, args, context) {
        const posts = await prisma.post.findMany();
        return posts;
      },
    },
  }),
});

const MutationType = new GraphQLObjectType({
  name: "Mutation",
  fields: () => ({
    addPost: {
      type: PostType,
      args: {
        title: { type: GraphQLString },
        description: { type: GraphQLString },
        category: { type: GraphQLString },
      },
      async resolve(parent, args, context) {
        authCheckUser(context.isAuth, context.error);
        const post = await prisma.post.create({
          data: {
            title: args.title,
            description: args.description,
            category: args.category,
            authorId: context.userId,
          },
        });
        return post;
      },
    },
    toggleUpVote: {
      type: PostType,
      args: {
        postId: { type: GraphQLID },
      },
      async resolve(parent, args, context) {
        authCheckUser(context.isAuth, context.error);
        const upvoted = await prisma.post.findUnique({
          where: {
            id: args.postId,
          },
          select: {
            userUpvoteList: {
              where: {
                id: context.userId,
              },
            },
          },
        });
        if (!upvoted) {
          throw Error("Post could not be found");
        }

        if (upvoted.userUpvoteList.length === 0) {
          const post = await prisma.post.update({
            where: {
              id: args.postId,
            },
            data: {
              upVotes: { increment: 1 },
              userUpvoteList: {
                connect: { id: context.userId },
              },
            },
          });
          return post;
        }

        const post = await prisma.post.update({
          where: {
            id: args.postId,
          },
          data: {
            upVotes: { decrement: 1 },
            userUpvoteList: {
              disconnect: { id: context.userId },
            },
          },
        });
        return post;
      },
    },

    addComment: {
      type: CommentType,
      args: {
        postId: { type: GraphQLID },
        content: { type: GraphQLString },
      },
      async resolve(parent, args, context) {
        authCheckUser(context.isAuth, context.error);
        const comment = await prisma.comment.create({
          data: {
            content: args.content,
            authorId: context.userId,
            postId: args.postId,
          },
        });
        return comment;
      },
    },
    addReply: {
      type: ReplyType,
      args: {
        commentId: { type: GraphQLID },
        content: { type: GraphQLString },
      },
      async resolve(parent, args, context) {
        const reply = await prisma.reply.create({
          data: {
            content: args.content,
            commentId: args.commentId,
            authorId: context.userId,
          },
        });
        return reply;
      },
    },
  }),
});

export default new GraphQLSchema({
  query: RootQueryType,
  mutation: MutationType,
});
