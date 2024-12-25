import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
   const user= await User.findById(userId)
   const accessToken=user.generateAccessToken()
   const refreshToken=user.generateRefreshToken()
   //give accesstoken to the user but store refereshToken in the database so that we don't need to give again and again the token to the user
   user.refreshToken=refreshToken
   await user.save({validateBeforeSave:false}) //when you use save method it start kicking all properties of userSchema in mongoose so you need password also, to avoid that validate before save is used here
   return {accessToken,refreshToken}





  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  //get user details from frontend
  //validaton(email is not empty or format is correct or not)
  //check if user already exists:username and email
  //check for images , check for avatar
  //upload them to cloudinary,avatar
  //create user object -create entry in db
  //remove password and refresh token field from response
  //check for user creation
  //return the response

  const { fullName, email, username, password } = req.body;
  console.log("email:", email);

  if (
    [fullName, email, username, password].some((field) => field?.trim === "")
  ) {
    throw new ApiError(400, "all fields are required");
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with username and email already exists");
  }
  //console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //req body->data
  //username or email
  //find the user
  // password check
  //access and referesh token
  //send cookies

  const { email, username, password } = req.body;

  if (!username || !email) {
    throw new ApiError(400, "username of email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }], // or operator find the value based on either username or email
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }
  //User - this is user in mongoDb can use method like findone
  //user- this is instance of mongoDb user and can use methods like isPasswordCorrect
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid User Credentials");
  }
  const {accessToken,refreshToken}=await generateAccessAndRefereshTokens(user._id)

  const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

  const options={
    httpOnly:true,
    secure:true
  }
  return res
  .status(200)
  .cookie("accessToken",accessToken,options)
  .cookie("refreshToken",refreshToken,options)
  .json(
    new ApiResponse(
      200,
      {
        user:loggedInUser,
        accessToken,
        refreshToken // we have already send the cookie but here this is the case where user might want to store the tokens in local storage for some use

      },
      "User logged in Successfully"
    )
  )


});

export { registerUser, loginUser };
