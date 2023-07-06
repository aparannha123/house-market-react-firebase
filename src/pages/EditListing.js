import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import Layout from "../components/layout/Layout";
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import Spinner from "../components/Spinner";
import { 
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL
 } from 'firebase/storage'
import { BsFiles } from 'react-icons/bs'
import { toast } from 'react-toastify';
import {db} from "../firebase.config";
import {v4 as uuidv4} from 'uuid';
// import { snapshotEqual } from 'firebase/firestore';
import {addDoc,collection,serverTimestamp, doc, updateDoc, getDoc} from "firebase/firestore"



const EditListing = () => {
    const storage = getStorage();
    const [loading, setLoading] = useState(false)
    const [listing, setListings] = useState(null)
    const params = useParams()
    const [geoLocationEnable, setGeoLocationEnable] = useState(false)
    const [formData, setFormData] = useState({
      type: 'rent',
      name: '',
      bedrooms: 1,
      bathrooms: 1,
      parking: false,
      furnished: false,
      address: '',
      offer: false,
      regularPrice: 0,
      discountedPrice: 0,
      images: {},
      latitude: 0,
      longitude: 0,
      useRef:''
    });
  
    const {
      type,
      name,
      bedrooms,
      bathrooms,
      parking,
      furnished,
      address,
      offer,
      regularPrice,
      discountedPrice,
      images,
      lat,
      long
    } = formData;
  
  
    const auth = getAuth();
    const navigate = useNavigate();
    const { latitude, longitude } = formData;
    const isMounted = useRef(true);
  
  
  
   
  
    useEffect(() => {
      if(isMounted){
        onAuthStateChanged(auth, (user) =>{
          setFormData({
            ...formData,
            useRef : user.uid,
          });
        });
      } else{
        navigate("/signin");
      }
    //   eslint-disable-next-line
    }, []);

    //useEffect to check login user

    useEffect(() => {
        if(listing && listing.useRef !== auth.currentUser.uid){
            toast.error('You can not Edit this Listing')
            navigate('/')
        }
        // eslint-disable-next-line
    },[])

    useEffect(() => {
        setLoading(true)
        const fetchListing = async() => {
            const docRef = doc(db, 'listings', params.listingId)
            const docSnap = await getDoc(docRef)
            if(docSnap.exists()){
                setListings(docSnap.data())
                setFormData({...docSnap.data()})
                setLoading(false)
            }else{
                navigate("/");
                toast.error("Listing Not Exists");
            }
        }
        fetchListing()
    },[]);
  
    if(loading){
      return <Spinner/>
    }
  
    // mutate func
    const onChangeHandler = (e) => {
      let boolean = null;
      if(e.target.value === "true"){
        boolean = true;
      }
      if(e.target.value === "false"){
        boolean = false;
      }
  
      // files
      if(e.target.files){
        setFormData((prevState) => ({
          ...prevState,
          images: e.target.files,
        }));
      }
      // text/booleans/number
      if(!e.target.files){
        setFormData((prevState)=> ({
            ...prevState,
            [e.target.id] : boolean ?? e.target.value,
          }));
        }
    };
  
    // form submit
    const onSubmit = async (e) => {
      
      e.preventDefault();
      // console.log(formData);
      if (images > 6){
        setLoading(false);
        toast.error('Max 6 images can be selected');
        return;
      }
      if(discountedPrice >= regularPrice){
        setLoading(false);
        toast.error('Discount Price Should be Less Than Regular Price');
        return;
      }
      
      let geoLocation = {}
      let location;
      if(geoLocationEnable){
        const response = await fetch(`https:/maps.googleapis.com/maps/api/geocode/json?address=${address}&key=AIzaSyCcdggkOmLBbc0uo93LdD7VCv2npMpUy8Y`)
        const data = await response.json()
        console.log(data)
      }else{
        geoLocation.lat = latitude;
        geoLocation.long = longitude;
        // location= address;
      }
      //store images to firebase storage
      const storeImage = async (image) => {
        return new Promise((resolve, reject) =>{
          const storage = getStorage();
          const fileName = `${auth.currentUser.uid}-${uuidv4()}`;
          const storageRef = ref(storage, 'images/' +fileName);
          const uploadTask = uploadBytesResumable(storageRef, image);
          uploadTask.on("state_changed", (snapshot) =>{
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            console.log ('upload is' + progress+ '%done')
            switch(snapshot.state){
              case 'paused': 
              console.log('upload is paused')
              break
              case 'running' :
              console.log('upload is running')
  
            }
          },
          (error) => {reject(error);
          },
          //success
          () =>{
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
              resolve(downloadURL);
            })
          }
          )
        })
      }
      const imgUrls = await Promise.all(
        [...images].map(image => storeImage(image))
      ).catch(() => {
        setLoading(false)
        toast.error("Images not uploaded");
        return;
      })
      console.log(imgUrls);
  
      //save from data
      const formDataCopy = {
        ...formData,
        imgUrls,
        geoLocation,
        timestamp:serverTimestamp()}
      formData.location = address
      delete formDataCopy.images
      //delete formDataCopy.address
      !formDataCopy.offer && delete formDataCopy.discountedPrice;
      const docRef = doc(db, 'listings', params.listingId)
      await updateDoc(docRef, formDataCopy);
      toast.success('Listing Updated !')
      navigate(`/category/${formDataCopy.type}/${docRef.id}`);
  
      setLoading(false);
    };
  
   
    return (
      <Layout>
        <div className='container d-flex flex-column align-items-center justify-content-center mb-4'>
          <h3 className='mt-3 w-50 bg-dark text-light p-2 text-center'>
            Update Listing &nbsp;
            <label className='file' htmlFor='file'>
              <BsFiles />
            </label>
            <input
              name='file'
              type='file'
              id='file'
              style={{ display: 'none' }}
            />
  
            {/* <AiOutlineFileAdd/> */}
          </h3>
          {/* sell rent button */}
          <form className='w-50 bg-light p-4' onSubmit={onSubmit}>
            <div className='d-flex flex-row mt-4'>
              <div className='form-check'>
                <input
                  className='form-check-input'
                  type='radio'
                  value='rent'
                  onChange={onChangeHandler}
                  defaultChecked
                  name='type'
                  id='type' />
                <label className='form-check-label' htmlFor='rent'>
                  Rent
                </label>
              </div>
              <div className='form-check ms-3'>
                <input
                  className='form-check-input'
                  type='radio'
                  name='type'
                  value='sale'
                  onChange={onChangeHandler}
                  id='type'
                />
                <label className='form-check-label' htmlFor='sale'>
                  Sale
                </label>
              </div>
            </div>
  
             {/* name */}
            <div className='mb-3 mt-4'>
              <label htmlFor='name' className='form-label'>
                Name
              </label>
              <input
              type='text'
              className='form-control'
              id='name'
              value={name}
              onChange={onChangeHandler}
              required />
            </div>
  
            {/* bedrooms */}
            <div className='mb-3 mt-4'>
              <label htmlFor='bedrooms' className='form-label'>
                Bedrooms
              </label>
              <input
              type='number'
              className='form-control'
              id='bedrooms'
              value={bedrooms}
              onChange={onChangeHandler}
              required />
            </div>
  
            {/* bathrooms */}
            <div className='mb-3'>
              <label htmlFor='parking' className='form-label'>
                Bathrooms
              </label>
              <input
              type='number'
              className='form-control'
              id='bathrooms'
              value={bathrooms}
              onChange={onChangeHandler}
              required />
            </div>
  
            {/* parking */}
            <div className='mb-3'>
              <label htmlFor='parking' className='form-label'>
                Parking:
              </label>
              <div className='d-flex flex-row'>
                <div className='form-check'>
                  <input
                  className='form-check-input'
                  type='radio'
                  value={true}
                  onChange={onChangeHandler}
                  name='parking'
                  id='parking'
                  />
                  <label className='form-check-label' htmlFor='yes'>
                    Yes
                  </label>
                </div>
                <div className='form-check ms-3'>
                  <input
                  className='form-check-input'
                  type='radio'
                  value={false}
                  onChange={onChangeHandler}
                  defaultChecked
                  name='parking'
                  id='parking'/>
                  <label className='form-check-label' htmlFor='no'>
                    No
                  </label>
                </div>
              </div>
            </div>
  
            {/* furnished */}
            <div className='mb-3'>
              <label htmlFor='furnished' className='form-label'>
                Furnished :
              </label>
              <div className='d-flex flex-row'>
                <div className='form-check'>
                  <input
                  className='form-check-input'
                  type='radio'
                  value={'true'}
                  onChange={onChangeHandler}
                  name='furnished'
                  id='furnished'
                  />
                  <label className='form-check-label' htmlFor='yes'>
                    Yes
                  </label>
                </div>
                <div className='form-check ms-3'>
                  <input
                  className='form-check-input'
                  type='radio'
                  value={false}
                  onChange={onChangeHandler}
                  defaultChecked
                  name='furnished'
                  id='furnished'/>
                  <label className='form-check-label' htmlFor='no'>
                    No
                  </label>
                </div>
              </div>
            </div>
  
            {/* address */}
            <div className='mb-3'>
              <label htmlFor='address'>Address :</label>
              <textarea
              className='form-control'
              placeholder='Enter Your Address'
              id='address'
              value={address}
              onChange={onChangeHandler}
              required />
            </div>
  
            {/* geoLocation */}
            {!geoLocationEnable &&(
              <div className='mb-3'>
                <div className='d-flex flex-row'>
                  <div className='form-check'>
                    <label className='form-check-label' htmlFor='yes'>
                      Latitude
                    </label>
                    <input
                    className='form-control'
                    type='number'
                    value={latitude}
                    onChange={onChangeHandler}
                    name='latitude'
                    id='latitude'
                    />
                  </div>
                  <div className='form-check ms-3'>
                    <label className='form-check-label' htmlFor='no'>
                      Longitude
                    </label>
                    <input
                    className='form-control'
                    type='number'
                    name='longitude'
                    value={longitude}
                    onChange={onChangeHandler}
                    id='longitude'
                    />
                  </div>
                </div>
              </div>
            )}
  
            {/* offers */}
            <div className='mb-3'>
              <label htmlFor='offer' className='form-label'>
                Offer :
              </label>
              <div className='d-flex flex-row'>
                <div className='form-check'>
                  <input
                  className='form-check-input'
                  type='radio'
                  value={true}
                  onChange={onChangeHandler}
                  name='offer'
                  id='offer'
                  />
                  <label className='form-check-label' htmlFor='yes'>
                    Yes
                  </label>
                </div>
                <div className='form-check ms-3'>
                  <input
                  className='form-check-input'
                  type='radio'
                  name='offer'
                  value={false}
                  defaultChecked
                  onChange={onChangeHandler}
                  id='offer'/>
                  <label className='form-check-label' htmlFor='no'>
                    No
                  </label>
                </div>
              </div>
            </div>
  
            {/* regular price */}
            <div className='mb-3 mt-4'>
              <label htmlFor='name' className='form-label'>
                Regular Price: 
              </label>
              <div className='d-flex flex-row'>
                <input
                type='number'
                className='form-control w-50'
                id='regularPrice'
                name='regularPrice'
                value={regularPrice}
                onChange={onChangeHandler}
                required
                />
                {type === "rent" && <p className='ms-4 mt-2'>₹ / Month</p>}
              </div>
            </div>
            {/* offer */}
            {offer && (
              <div className='mb-3 mt-4'>
                <label htmlFor='discountedPrice' className='form-label'>
                  Discounted Price :
                </label>
  
                <input
                type='number'
                className='form-control w-50'
                id='discountedPrice'
                name='discountedPrice'
                value={discountedPrice}
                onChange={onChangeHandler}
                required
                />
              </div>
            )}
  
            {/* file images etc */}
            <div className='mb-3'>
              <label htmlFor='formFile' className='form-label'>
                select images :
              </label>
              <input
              className='form-control'
              type='file'
              id='images'
              onChange={onChangeHandler}
              max="6"
              accept='.jpg, .png, .jpeg'
              multiple
              required/>      
            </div>
            
            <div className='position-relative' >
                <div className="form-check mb-5">
                  <input
                    className='form-control btn btn-primary mt-4'
                    style={{left: "50%"}}
                    // disabled={!name || !address || !regularPrice || !images}
                    type='submit'
                    value= "Update Listing"
                 />
                </div>
            </div>
          </form>
        </div>
      </Layout>
  
    );
}

export default EditListing